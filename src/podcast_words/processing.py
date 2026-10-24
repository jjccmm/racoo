"""Resume selected catalog episodes through the public offline processing command."""

import json
import os
import platform
import time
from copy import deepcopy
from importlib.metadata import version
from pathlib import Path

from pydantic import ValidationError

from podcast_words.catalog import Catalog, CatalogEpisode
from podcast_words.contracts import Episode
from podcast_words.json_io import require_distinct_output, write_json
from podcast_words.revisions import digest, validate_completed_episode
from podcast_words.transcribe import EpisodeInput, print_episode_timings, processing_configuration


def configuration_revision() -> str:
    return digest(
        {
            **processing_configuration(),
            "audio_decode": "ffmpeg mono PCM s16le 16000 Hz; original full timeline",
            "segments": "recognized speech grouped in order, at most 300 seconds",
            "runtime_versions": {
                "python": platform.python_version(),
                **{
                    name: version(name)
                    for name in (
                        "onnxruntime-gpu",
                        "onnx-asr",
                        "numpy",
                        "huggingface-hub",
                        "podcast-words",
                    )
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
    values["transcription"]["configuration_revision"] = revision
    values["transcription"]["transcript_revision"] = digest(
        {
            "segments": [segment.model_dump(mode="json") for segment in episode.segments],
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
    run_started = time.monotonic()
    try:
        catalog = Catalog.model_validate_json(arguments.catalog.read_bytes())
        selected_ids = arguments.episode_id
        if len(selected_ids) != len(set(selected_ids)):
            raise ValueError("episode IDs must be unique in a selected run")
        entries = [selection(catalog, identity) for identity in selected_ids]
        if arguments.run_report:
            require_distinct_output(
                arguments.run_report,
                [
                    arguments.catalog,
                    *[arguments.output_dir / f"{entry.episode_id}.json" for entry in entries],
                ],
                label="run report",
            )
    except (OSError, ValidationError, ValueError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=True))
        return 1

    config_revision = configuration_revision()
    transcriber = None
    results = []
    episode_measurements = []
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
            legacy_provenance = None
            if previous is not None and not arguments.retranscribe:
                try:
                    _saved_revisions, legacy_provenance = validate_completed_episode(previous)
                except ValueError as error:
                    entry.processing_status = "failed"
                    write_json(arguments.catalog, catalog.model_dump(mode="json"))
                    result.update(
                        {
                            "status": "conflict",
                            "output": str(destination),
                            "error": (
                                f"saved episode provenance is invalid and was preserved: {error}; "
                                "review it, then use --retranscribe to replace it explicitly"
                            ),
                        }
                    )
                    results.append(result)
                    continue
            if previous is not None and not arguments.retranscribe:
                result.update(
                    {
                        "status": "skipped",
                        "timings": previous.timings.model_dump(),
                        "audio_seconds": previous.audio.duration_seconds,
                        "metadata_mismatches": metadata_mismatches(previous, metadata),
                        "configuration_mismatches": config_mismatches(previous, config_revision),
                        "output": str(destination),
                    }
                )
                if legacy_provenance:
                    result["legacy_provenance"] = legacy_provenance
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
            persistence_started = time.monotonic()
            transcript = with_revisions(transcript, config_revision)
            # Validate the bytes as read back from the temporary file before the
            # atomic replace can make them visible as a completed artifact.
            write_json(
                destination,
                transcript.model_dump(mode="json"),
                validate=lambda content: Episode.model_validate_json(content),
            )
            persisted_bytes = destination.stat().st_size
            episode_measurements_snapshot = deepcopy(transcriber.measurements)
            for shared_key in ("model", "runtime", "processing_configuration"):
                episode_measurements_snapshot.pop(shared_key, None)
            measurements = {
                "episode_id": entry.episode_id,
                **episode_measurements_snapshot,
                "configuration_revision": config_revision,
                "result_validation_and_serialization": {
                    "elapsed_seconds": round(time.monotonic() - persistence_started, 6),
                    "bytes": persisted_bytes,
                },
            }
            episode_measurements.append(measurements)
            entry.processing_status = "completed"
            write_json(arguments.catalog, catalog.model_dump(mode="json"))
            print_episode_timings(transcript)
            result.update(
                {
                    "status": "completed",
                    "output": str(destination),
                    "audio_seconds": transcript.audio.duration_seconds,
                    "timings": transcript.timings.model_dump(),
                }
            )
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

    ok = all(result["status"] in {"completed", "skipped"} for result in results)
    report = {"ok": ok, "selected": selected_ids, "results": results}
    runtime_measurements = {
        "schema_version": 1,
        "code_revision": os.environ.get("PODCAST_WORDS_CODE_REVISION"),
        "model": transcriber.measurements["model"] if transcriber is not None else {},
        "runtime": transcriber.measurements["runtime"]
        if transcriber is not None
        else {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "processor": platform.processor() or None,
            "logical_cpu_count": os.cpu_count(),
        },
        "configuration_revision": config_revision,
        "processing_configuration": processing_configuration(),
        "episodes": episode_measurements,
        "total_elapsed_seconds": round(time.monotonic() - run_started, 6),
        "total_elapsed_boundary": (
            "Starts inside process() and ends before writing the optional run report and stdout. "
            "Includes catalog/control work and unattributed overhead; excludes interpreter/uv "
            "startup and environment setup."
        ),
        "model_setup_scope": (
            "One shared model setup per process run, reported only under model; never sum it "
            "across episodes."
        ),
        "inference_runs": sum("episode" in item for item in episode_measurements),
        "skipped_runs": sum(item.get("status") == "skipped" for item in results),
    }
    report["runtime_measurements"] = runtime_measurements
    if arguments.run_report:
        try:
            write_json(arguments.run_report, runtime_measurements)
        except OSError as error:
            print(
                json.dumps(
                    {
                        "ok": False,
                        "error": f"could not write run report {arguments.run_report}: {error}",
                        "completed_artifacts_preserved": [
                            item["output"] for item in results if item.get("status") == "completed"
                        ],
                    },
                    ensure_ascii=True,
                )
            )
            return 1
    print(json.dumps(report, indent=2, ensure_ascii=True))
    return 130 if interrupted else (0 if ok else 1)
