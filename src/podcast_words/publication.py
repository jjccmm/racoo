"""Prepare a selected and internally consistent set of public episode artifacts."""

import argparse
import json
import os
import shutil
import tempfile
from pathlib import Path, PurePath

from pydantic import ValidationError

from podcast_words import analysis
from podcast_words.catalog import Catalog, CatalogEpisode
from podcast_words.contracts import Episode
from podcast_words.json_io import write_json
from podcast_words.revisions import (
    digest,
    validate_compatible_processing,
    validate_completed_episode,
)


def fingerprint(value: object) -> str:
    return digest(value)


def relative_episode_paths(path: Path) -> list[Path]:
    value = json.loads(path.read_bytes())
    if not isinstance(value, list) or not value or not all(isinstance(item, str) for item in value):
        raise ValueError("Episode selection must be a nonempty JSON list of relative file paths")
    result = []
    for item in value:
        relative = PurePath(item)
        if relative.is_absolute() or ".." in relative.parts or relative.drive:
            raise ValueError(f"Episode paths must remain inside the selection directory: {item}")
        result.append((path.parent / Path(item)).resolve())
    if len(set(result)) != len(result):
        raise ValueError("Episode selection contains duplicate files")
    return result


def catalog_entry(catalog: Catalog, episode: Episode) -> CatalogEpisode:
    matches = [item for item in catalog.episodes if item.episode_id == episode.episode_id]
    if len(matches) != 1:
        raise ValueError(f"Catalog must contain exactly one selected identity {episode.episode_id}")
    return matches[0]


def check_identity(episode: Episode, catalog: Catalog, entry: CatalogEpisode) -> None:
    if episode.podcast_id != catalog.podcast_id:
        raise ValueError(f"Podcast identity mismatch for {episode.episode_id}")
    if entry.processing_status != "completed":
        raise ValueError(f"Selected episode is not completed: {episode.episode_id}")
    if entry.source_status == "source-gap" or entry.audio_availability == "unavailable":
        raise ValueError(f"Selected episode has no processable audio source: {episode.episode_id}")
    if episode.source.kind != entry.source.kind:
        raise ValueError(f"Source kind mismatch for {episode.episode_id}")
    if entry.source.kind in {"supplemental", "synthetic"}:
        if episode.source.key != entry.source.key:
            raise ValueError(f"Stable source key mismatch for {episode.episode_id}")
    else:
        saved_guids = {
            value for value in [episode.source.guid, *episode.source.guid_aliases] if value
        }
        saved_guids.add(episode.source.key)
        verified_aliases = {item.guid for item in entry.identity_verifications}
        catalog_guids = {entry.source.guid, *(entry.source.guid_aliases)} | verified_aliases
        if not saved_guids.intersection(catalog_guids):
            raise ValueError(f"Unrelated source identity for selected episode {episode.episode_id}")


def metadata_current(episode: Episode, catalog: Catalog, entry: CatalogEpisode) -> Episode:
    if entry.published_at is None:
        raise ValueError(f"Selected catalog entry has no publication date: {episode.episode_id}")
    values = episode.model_dump(mode="json")
    values.update(
        {
            "podcast_id": catalog.podcast_id,
            "source": entry.source.model_dump(mode="json"),
            "title": entry.title,
            "episode_number": entry.episode_number,
            "webpage_url": str(entry.webpage_url) if entry.webpage_url else None,
        }
    )
    values["published_at"] = entry.published_at.isoformat()
    return Episode.model_validate_json(json.dumps(values, ensure_ascii=False))


def revisions(episode: Episode) -> tuple[Episode, bool]:
    values = episode.model_dump(mode="json")
    transcription = values["transcription"]
    revisions_by_field, legacy = validate_completed_episode(episode)
    transcription.update(revisions_by_field)
    revised = Episode.model_validate_json(json.dumps(values, ensure_ascii=False))
    return revised, legacy is not None


def public_catalog(catalog: Catalog, entries: list[CatalogEpisode]) -> dict:
    latest = catalog.snapshots[-1] if catalog.snapshots else None
    snapshot = None
    if latest:
        snapshot = {
            "fetchedAt": latest.fetched_at.isoformat(),
            "sha256": latest.sha256,
            "itemCount": latest.item_count,
        }
    return {
        "schemaVersion": 1,
        "podcastId": catalog.podcast_id,
        "sourceSnapshot": snapshot,
        "episodes": [
            {
                "episodeId": item.episode_id,
                "source": item.source.model_dump(mode="json"),
                "title": item.title,
                "publishedAt": item.published_at.isoformat() if item.published_at else None,
                "episodeNumber": item.episode_number,
                "webpageUrl": str(item.webpage_url) if item.webpage_url else None,
                "sourceStatus": item.source_status,
                "audioAvailability": item.audio_availability,
            }
            for item in entries
        ],
    }


def replace_generated_directory(staging: Path, output: Path) -> None:
    backup = None
    if output.exists():
        marker = output / "manifest.json"
        try:
            prior = json.loads(marker.read_bytes())
        except (OSError, ValueError) as error:
            raise ValueError(
                f"Refusing to replace an unrecognized output directory: {output}"
            ) from error
        if prior.get("generatedBy") != "podcast-words publish":
            raise ValueError(f"Refusing to replace an unrecognized output directory: {output}")
        backup = Path(tempfile.mkdtemp(prefix=f".{output.name}-old-", dir=output.parent))
        backup.rmdir()
        os.replace(output, backup)
    try:
        os.replace(staging, output)
    except Exception:
        if backup is not None:
            os.replace(backup, output)
        raise
    if backup is not None:
        shutil.rmtree(backup)


def prepare(arguments: argparse.Namespace) -> dict:
    catalog = Catalog.model_validate_json(arguments.catalog.read_bytes())
    episode_paths = relative_episode_paths(arguments.episodes)
    episodes, entries, derived = [], [], []
    for source_path in episode_paths:
        episode = Episode.model_validate_json(source_path.read_bytes())
        entry = catalog_entry(catalog, episode)
        check_identity(episode, catalog, entry)
        current = metadata_current(episode, catalog, entry)
        current, changed = revisions(current)
        if changed:
            derived.append(current.episode_id)
        episodes.append(current)
        entries.append(entry)
    if not episodes:
        raise ValueError("A publication must contain at least one completed episode")
    processing_revision = validate_compatible_processing(episodes)
    if len({episode.episode_id for episode in episodes}) != len(episodes):
        raise ValueError("Duplicate selected episode identity")

    output = arguments.output.resolve()
    analyses = arguments.analyses.resolve()
    if output == analyses or output in analyses.parents:
        raise ValueError(
            "Analysis cache must be outside the generated publication source directory"
        )
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f".{output.name}-staging-", dir=output.parent))
    try:
        episode_directory = staging / "episodes"
        episode_directory.mkdir()
        for episode in episodes:
            write_json(
                episode_directory / f"{episode.episode_id}.json", episode.model_dump(mode="json")
            )
        corpus_path = staging / "episodes.json"
        write_json(
            corpus_path,
            [f"episodes/{episode.episode_id}.json" for episode in episodes],
        )
        analysis_result = analysis.analyze(
            argparse.Namespace(
                episodes=corpus_path,
                output=analyses,
                publish=staging / "stats",
                analysis_version=arguments.analysis_version,
                cache_only=arguments.cache_only,
            )
        )
        analysis_data = {
            episode.episode_id: analysis.Analysis.model_validate_json(
                (analyses / f"{episode.episode_id}.json").read_bytes()
            ).model_dump(mode="json")
            for episode in episodes
        }
        source_catalog = public_catalog(catalog, entries)
        revisions_by_episode = {
            episode.episode_id: {
                "configurationRevision": episode.transcription.configuration_revision,
                "transcriptRevision": episode.transcription.transcript_revision,
            }
            for episode in episodes
        }
        preparation_id = fingerprint(
            {
                "catalog": source_catalog,
                "episodes": [episode.model_dump(mode="json") for episode in episodes],
                "analyses": analysis_data,
                "analysisVersion": arguments.analysis_version,
                "processingConfiguration": processing_revision,
            }
        )
        write_json(staging / "catalog.json", source_catalog)
        write_json(
            staging / "manifest.json",
            {
                "schemaVersion": 1,
                "generatedBy": "podcast-words publish",
                "preparationId": preparation_id,
                "podcastId": catalog.podcast_id,
                "state": "selected-pilot",
                "archiveComplete": False,
                "episodeIds": [episode.episode_id for episode in episodes],
                "derivedRevisionEpisodeIds": derived,
                "analysisVersion": arguments.analysis_version,
                "sourceSnapshotSha256": (
                    source_catalog["sourceSnapshot"]["sha256"]
                    if source_catalog["sourceSnapshot"]
                    else None
                ),
                "transcriptionRevisions": revisions_by_episode,
            },
        )
        replace_generated_directory(staging, output)
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    return {"ok": True, "preparationId": preparation_id, "analysis": analysis_result}


def publish(arguments: argparse.Namespace) -> int:
    try:
        result = prepare(arguments)
    except (OSError, ValidationError, ValueError, KeyError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=True))
        return 1
    print(json.dumps(result, ensure_ascii=True))
    return 0
