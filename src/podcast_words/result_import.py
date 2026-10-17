"""Validate and safely import completed episode results from another run."""

import json
from pathlib import Path

from pydantic import ValidationError

from podcast_words.catalog import Catalog, CatalogEpisode
from podcast_words.contracts import Episode
from podcast_words.processing import digest, write_json

REVISION_FIELDS = ("input_revision", "configuration_revision", "transcript_revision")
RECOGNITION_FIELDS = (
    "model_id",
    "model_revision",
    "export_id",
    "export_revision",
    "configuration",
    "execution_providers",
    "runtime_versions",
)
METADATA_FIELDS = ("title", "published_at", "episode_number", "webpage_url")


def selected(catalog: Catalog, episode_id: str) -> CatalogEpisode:
    for entry in catalog.episodes:
        if entry.episode_id == episode_id:
            return entry
    raise ValueError(f"episode ID is not assigned by the local catalog: {episode_id}")


def identity_match(episode: Episode, catalog: Catalog, entry: CatalogEpisode) -> str:
    if episode.podcast_id != catalog.podcast_id:
        raise ValueError(f"podcast identity mismatch: expected {catalog.podcast_id}")
    if episode.episode_id != entry.episode_id:
        raise ValueError(f"episode identity mismatch: expected {entry.episode_id}")
    if episode.source.kind != entry.source.kind or episode.source.key != entry.source.key:
        raise ValueError(
            f"stable source identity mismatch: expected {entry.source.kind}:{entry.source.key}"
        )
    if entry.source.kind == "rss" and episode.source.guid != entry.source.guid:
        if episode.source.guid not in entry.source.guid_aliases:
            raise ValueError("saved source GUID is neither current nor a verified catalog alias")
        return "verified-guid-alias"
    return "catalog-assigned"


def configuration_fingerprint(episode: Episode) -> str:
    transcription = episode.transcription
    return digest({field: getattr(transcription, field) for field in RECOGNITION_FIELDS})


def fingerprints(episode: Episode) -> tuple[dict[str, str], str | None]:
    transcription = episode.transcription
    revisions = [getattr(transcription, name) for name in REVISION_FIELDS]
    if any(revisions) and not all(revisions):
        raise ValueError(
            "processing revision provenance is partial; expected all three revision fields"
        )

    configuration_revision = transcription.configuration_revision or configuration_fingerprint(
        episode
    )
    transcript_revision = digest(
        {
            "segments": [segment.model_dump(mode="json") for segment in episode.segments],
            "audio_sha256": episode.audio.sha256,
            "configuration_revision": configuration_revision,
        }
    )
    if transcription.input_revision and transcription.input_revision != episode.audio.sha256:
        raise ValueError("input_revision does not match the saved audio SHA-256")
    if (
        transcription.transcript_revision
        and transcription.transcript_revision != transcript_revision
    ):
        raise ValueError("transcript_revision does not match the saved transcript and provenance")

    legacy = None if all(revisions) else "complete-without-revision-fields"
    return (
        {
            "input_revision": episode.audio.sha256,
            "configuration_revision": configuration_revision,
            "transcript_revision": transcript_revision,
        },
        legacy,
    )


def catalog_metadata_differences(episode: Episode, entry: CatalogEpisode) -> list[str]:
    fields = [
        name
        for name, current, saved in (
            ("title", entry.title, episode.title),
            ("published_at", entry.published_at, episode.published_at),
            ("episode_number", entry.episode_number, episode.episode_number),
            ("webpage_url", entry.webpage_url, episode.webpage_url),
            ("source.reference_url", entry.source.reference_url, episode.source.reference_url),
            ("source.guid", entry.source.guid, episode.source.guid),
        )
        if current != saved
    ]
    current_audio_url = entry.enclosures[0].url if entry.enclosures else None
    if str(current_audio_url) != str(episode.audio.url):
        fields.append("audio_url")
    return fields


def validate_incoming(path: Path, catalog: Catalog) -> dict:
    result = {"path": str(path)}
    try:
        episode = Episode.model_validate_json(path.read_bytes())
        if not episode.segments:
            raise ValueError("completed result must contain at least one recognized segment")
        entry = selected(catalog, episode.episode_id)
        result["identity_match"] = identity_match(episode, catalog, entry)
        result["catalog_metadata_mismatches"] = catalog_metadata_differences(episode, entry)
        revisions, legacy = fingerprints(episode)
    except (OSError, ValidationError, ValueError) as error:
        result.update(status="rejected", error=str(error))
        return result

    result.update(
        status="validated",
        episode_id=episode.episode_id,
        revisions=revisions,
        _episode=episode,
        _entry=entry,
        _legacy=legacy,
    )
    return result


def recognition_differences(existing: Episode, incoming: Episode) -> list[str]:
    differences = []
    if existing.audio != incoming.audio:
        differences.append("audio")
    if any(
        getattr(existing.transcription, name) != getattr(incoming.transcription, name)
        for name in RECOGNITION_FIELDS
    ):
        differences.append("configuration")
    if existing.segments != incoming.segments:
        differences.append("transcript")
    if (
        existing.transcription.configuration_revision
        != incoming.transcription.configuration_revision
    ):
        differences.append("configuration")
    return differences


def metadata_differences(existing: Episode | None, incoming: Episode) -> list[str]:
    if existing is None:
        return []
    fields = [
        name for name in METADATA_FIELDS if getattr(existing, name) != getattr(incoming, name)
    ]
    if existing.source.reference_url != incoming.source.reference_url:
        fields.append("source.reference_url")
    if existing.source.guid != incoming.source.guid:
        fields.append("source.guid")
    return fields


def result_fingerprints(episode: Episode) -> dict[str, str]:
    revisions, _legacy = fingerprints(episode)
    return revisions


def import_results(arguments) -> int:
    try:
        catalog = Catalog.model_validate_json(arguments.catalog.read_bytes())
        if not arguments.input_dir.is_dir():
            raise ValueError(f"input directory does not exist: {arguments.input_dir}")
        paths = sorted(arguments.input_dir.glob("*.json"), key=lambda path: path.name.casefold())
        if not paths:
            raise ValueError(f"no episode JSON files found in {arguments.input_dir}")
    except (OSError, ValidationError, ValueError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=True))
        return 1

    results = [validate_incoming(path, catalog) for path in paths]
    by_id: dict[str, list[dict]] = {}
    for result in results:
        if result["status"] == "validated":
            by_id.setdefault(result["episode_id"], []).append(result)
    for episode_id, duplicates in by_id.items():
        if len(duplicates) > 1:
            for result in duplicates:
                result.update(
                    status="rejected",
                    error=f"multiple transfer files claim episode identity {episode_id}",
                )

    for result in results:
        if result["status"] != "validated":
            continue
        episode = result.pop("_episode")
        entry = result.pop("_entry")
        legacy = result.pop("_legacy")
        destination = arguments.output_dir / f"{episode.episode_id}.json"
        existing = None
        if destination.exists():
            try:
                existing = Episode.model_validate_json(destination.read_bytes())
                # Optional v1 revisions are either all present and consistent, or
                # all absent for a complete legacy result.
                fingerprints(existing)
            except (OSError, ValidationError) as error:
                result.update(
                    status="conflict",
                    conflicts=["existing_result_unvalidated"],
                    error=f"existing result cannot be validated and was preserved: {error}",
                )
                continue
            except ValueError as error:
                result.update(
                    status="conflict",
                    conflicts=["existing_provenance_unverified"],
                    error=f"existing result provenance cannot be verified and was preserved: {error}",
                )
                continue

        if existing is not None:
            conflicts = recognition_differences(existing, episode)
            if (
                existing.podcast_id != episode.podcast_id
                or existing.episode_id != episode.episode_id
                or existing.source.kind != episode.source.kind
                or existing.source.key != episode.source.key
                or (
                    existing.source.guid != episode.source.guid
                    and existing.source.guid not in entry.source.guid_aliases
                )
            ):
                conflicts.append("identity")
            if conflicts:
                result.update(
                    status="conflict",
                    conflicts=conflicts,
                    existing_revisions=result_fingerprints(existing),
                    incoming_revisions=result["revisions"],
                    error="saved completed result differs; existing bytes were preserved",
                )
                continue

            result.update(
                status="skipped",
                metadata_mismatches=metadata_differences(existing, episode),
            )
        else:
            try:
                write_json(destination, episode.model_dump(mode="json"))
                Episode.model_validate_json(destination.read_bytes())
            except (OSError, ValidationError) as error:
                result.update(status="rejected", error=f"result was not durably accepted: {error}")
                continue
            result.update(status="accepted", metadata_mismatches=[])

        entry.processing_status = "completed"
        try:
            write_json(arguments.catalog, catalog.model_dump(mode="json"))
        except OSError as error:
            result.update(
                status="failed",
                error=f"episode result is durable, but catalog completion could not be saved: {error}",
            )
            continue
        if legacy:
            result["legacy_provenance"] = legacy

    for result in results:
        result.pop("_episode", None)
        result.pop("_entry", None)
        result.pop("_legacy", None)
    ok = all(result["status"] in {"accepted", "skipped"} for result in results)
    print(json.dumps({"ok": ok, "results": results}, indent=2, ensure_ascii=True))
    return 0 if ok else 1
