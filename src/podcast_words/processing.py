"""Resume selected catalog episodes through the public offline processing command."""

import hashlib
import json
import os
import platform
import tempfile
from importlib.metadata import version
from pathlib import Path

from pydantic import ValidationError

from podcast_words.catalog import Catalog, CatalogEpisode
from podcast_words.contracts import Episode
from podcast_words.transcribe import EpisodeInput


def digest(value: object) -> str:
    encoded = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", newline="\n", dir=path.parent, delete=False
        ) as stream:
            temporary = Path(stream.name)
            json.dump(value, stream, indent=2, ensure_ascii=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def configuration_revision() -> str:
    from podcast_words.transcribe import (
        EXPORT_ID,
        EXPORT_REVISION,
        GPU_PROVIDER,
        MODEL_ID,
        MODEL_REVISION,
        VAD_ID,
        VAD_OPTIONS,
        VAD_REVISION,
        execution_provider,
        execution_provider_chain,
    )

    provider = execution_provider()
    return digest(
        {
            "model_id": MODEL_ID,
            "model_revision": MODEL_REVISION,
            "export_id": EXPORT_ID,
            "export_revision": EXPORT_REVISION,
            "vad_id": VAD_ID,
            "vad_revision": VAD_REVISION,
            "vad_options": VAD_OPTIONS,
            "quantization": "int8",
            "audio_decode": "ffmpeg mono PCM s16le 16000 Hz; original full timeline",
            "token_times": "segment-relative seconds + VAD start, once",
            "intra_op_num_threads": 4,
            "execution_providers": execution_provider_chain(),
            "runtime_versions": {
                "python": platform.python_version(),
                **{
                    "onnxruntime": version(
                        "onnxruntime-gpu" if provider == GPU_PROVIDER else "onnxruntime"
                    )
                },
                **{
                    name: version(name)
                    for name in ["onnx-asr", "numpy", "huggingface-hub", "podcast-words"]
                },
            },
        }
    )


def selection(catalog: Catalog, episode_id: str) -> CatalogEpisode:
    episode = next((item for item in catalog.episodes if item.episode_id == episode_id), None)
    if episode is None:
        raise ValueError(f"unknown episode ID in catalog: {episode_id}")
    return episode


def metadata_for(catalog: Catalog, entry: CatalogEpisode) -> EpisodeInput:
    if entry.published_at is None:
        raise ValueError(f"{entry.episode_id} has no publication date in the catalog")
    if not entry.enclosures:
        raise ValueError(f"{entry.episode_id} has no audio enclosure; source is not processable")
    return EpisodeInput(
        podcast_id=catalog.podcast_id,
        episode_id=entry.episode_id,
        source=entry.source,
        title=entry.title,
        published_at=entry.published_at,
        episode_number=entry.episode_number,
        webpage_url=entry.webpage_url,
        audio_url=entry.enclosures[0].url,
    )


def metadata_mismatches(episode: Episode, current: EpisodeInput) -> list[str]:
    fields = [
        "podcast_id",
        "episode_id",
        "source",
        "title",
        "published_at",
        "episode_number",
        "webpage_url",
    ]
    return [field for field in fields if getattr(episode, field) != getattr(current, field)] + (
        ["audio_url"] if str(episode.audio.url) != str(current.audio_url) else []
    )


def config_mismatches(episode: Episode, revision: str) -> list[str]:
    from podcast_words.transcribe import (
        EXPORT_ID,
        EXPORT_REVISION,
        MODEL_ID,
        MODEL_REVISION,
    )

    transcription = episode.transcription
    mismatches = []
    if transcription.model_id != MODEL_ID:
        mismatches.append("model_id")
    if transcription.model_revision != MODEL_REVISION:
        mismatches.append("model_revision")
    if transcription.export_id != EXPORT_ID:
        mismatches.append("export_id")
    if transcription.export_revision != EXPORT_REVISION:
        mismatches.append("export_revision")
    if transcription.configuration_revision != revision:
        mismatches.append("configuration_revision")
    return mismatches


def with_revisions(episode: Episode, revision: str) -> Episode:
    values = episode.model_dump(mode="json")
    values["transcription"]["input_revision"] = episode.audio.sha256
    values["transcription"]["configuration_revision"] = revision
    values["transcription"]["transcript_revision"] = digest(
        {
            "segments": [segment.model_dump(mode="json") for segment in episode.segments],
            "audio_sha256": episode.audio.sha256,
            "configuration_revision": revision,
        }
    )
    return Episode.model_validate_json(json.dumps(values, ensure_ascii=False))


def existing_episode(path: Path) -> Episode | None:
    if not path.exists():
        return None
    try:
        return Episode.model_validate_json(path.read_bytes())
    except (OSError, ValidationError):
        return None


def process(arguments) -> int:
    try:
        catalog = Catalog.model_validate_json(arguments.catalog.read_bytes())
        selected_ids = arguments.episode_id
        if len(selected_ids) != len(set(selected_ids)):
            raise ValueError("episode IDs must be unique in a selected run")
        entries = [selection(catalog, identity) for identity in selected_ids]
    except (OSError, ValidationError, ValueError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=True))
        return 1

    config_revision = configuration_revision()
    transcriber = None
    results = []
    interrupted = False
    for entry in entries:
        result = {"episode_id": entry.episode_id}
        destination = arguments.output_dir / f"{entry.episode_id}.json"
        try:
            metadata = metadata_for(catalog, entry)
            previous = existing_episode(destination)
            if previous is not None:
                identity_mismatches = [
                    field
                    for field, actual, expected in [
                        ("podcast_id", previous.podcast_id, catalog.podcast_id),
                        ("episode_id", previous.episode_id, entry.episode_id),
                        ("source.kind", previous.source.kind, entry.source.kind),
                        ("source.key", previous.source.key, entry.source.key),
                    ]
                    if actual != expected
                ]
                if (
                    previous.source.guid != entry.source.guid
                    and previous.source.guid not in entry.source.guid_aliases
                ):
                    identity_mismatches.append("source.guid")
            else:
                identity_mismatches = []
            if previous is not None and identity_mismatches:
                result.update(
                    {
                        "status": "conflict",
                        "identity_mismatches": identity_mismatches,
                        "output": str(destination),
                        "error": "saved episode has a different stable identity; resolve explicitly",
                    }
                )
                results.append(result)
                continue
            if previous is not None and not arguments.retranscribe:
                result.update(
                    {
                        "status": "skipped",
                        "metadata_mismatches": metadata_mismatches(previous, metadata),
                        "configuration_mismatches": config_mismatches(previous, config_revision),
                        "output": str(destination),
                    }
                )
                entry.processing_status = "completed"
                write_json(arguments.catalog, catalog.model_dump(mode="json"))
                results.append(result)
                continue

            entry.processing_status = "processing"
            write_json(arguments.catalog, catalog.model_dump(mode="json"))
            if transcriber is None:
                from podcast_words.transcribe import Transcriber

                transcriber = Transcriber(arguments.cache_dir)
            transcript = transcriber.transcribe(metadata)
            transcript = with_revisions(transcript, config_revision)
            # Validate the bytes as read back from the temporary file before the
            # atomic replace can make them visible as a completed artifact.
            content = transcript.model_dump_json(indent=2) + "\n"
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w", encoding="utf-8", newline="\n", dir=destination.parent, delete=False
                ) as stream:
                    temporary = Path(stream.name)
                    stream.write(content)
                    stream.flush()
                    os.fsync(stream.fileno())
                Episode.model_validate_json(temporary.read_bytes())
                os.replace(temporary, destination)
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)
            entry.processing_status = "completed"
            write_json(arguments.catalog, catalog.model_dump(mode="json"))
            result.update({"status": "completed", "output": str(destination)})
        except KeyboardInterrupt:
            entry.processing_status = "failed"
            write_json(arguments.catalog, catalog.model_dump(mode="json"))
            result.update({"status": "interrupted", "error": "processing interrupted"})
            interrupted = True
        except Exception as error:
            entry.processing_status = "failed"
            try:
                write_json(arguments.catalog, catalog.model_dump(mode="json"))
            except OSError as save_error:
                error = RuntimeError(f"{error}; failed to save catalog status: {save_error}")
            result.update(
                {"status": "failed", "error": str(error), "error_type": type(error).__name__}
            )
        results.append(result)
        if interrupted:
            break

    execution_profile = None
    profile_error = None
    if transcriber is not None:
        try:
            execution_profile = transcriber.finish()
        except Exception as error:
            profile_error = {"type": type(error).__name__, "message": str(error)}
    ok = (
        all(result["status"] in {"completed", "skipped"} for result in results)
        and profile_error is None
    )
    report = {"ok": ok, "selected": selected_ids, "results": results}
    if execution_profile is not None:
        report["execution_profile"] = execution_profile
    if profile_error is not None:
        report["execution_profile_error"] = profile_error
    print(
        json.dumps(
            report,
            indent=2,
            ensure_ascii=True,
        )
    )
    return 130 if interrupted else (0 if ok else 1)
