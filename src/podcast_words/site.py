"""Prepare configured podcast publications from saved transcripts."""

import argparse
from pathlib import Path

from podcast_words.catalog import Catalog
from podcast_words.contracts import Episode
from podcast_words.json_io import write_json
from podcast_words.podcasts import read_configuration
from podcast_words.publication import check_identity, prepare


def completed_paths(catalog: Catalog, directory: Path) -> list[Path]:
    paths = []
    for entry in sorted(catalog.episodes, key=lambda item: item.episode_id):
        if entry.processing_status != "completed":
            continue
        path = directory / "episodes" / f"{entry.episode_id}.json"
        episode = Episode.model_validate_json(path.read_bytes())
        check_identity(episode, catalog, entry)
        paths.append(path.resolve())
    return paths


def prepare_site(configuration: Path, output: Path) -> dict:
    settings = read_configuration(configuration)
    sources = []
    episode_ids = set()
    for podcast in settings.podcasts:
        directory = podcast.data_directory(configuration)
        catalog_path = directory / "catalog.json"
        catalog = (
            Catalog.model_validate_json(catalog_path.read_bytes())
            if catalog_path.exists()
            else Catalog(podcast_id=podcast.id, feed_url=podcast.feed_url)
        )
        if catalog.podcast_id != podcast.id:
            raise ValueError(f"catalog belongs to a different podcast: {podcast.id}")
        paths = completed_paths(catalog, directory)
        destination = output.resolve() / podcast.id
        destination.mkdir(parents=True, exist_ok=True)
        ids = {path.stem for path in paths}
        if episode_ids & ids:
            raise ValueError("episode IDs must be unique across configured podcasts")
        episode_ids.update(ids)
        if paths:
            prepare(
                argparse.Namespace(
                    catalog=catalog_path,
                    episodes=None,
                    output=destination / "source",
                ),
                episode_paths=paths,
            )
        sources.append(
            {
                "id": podcast.id,
                "name": podcast.name,
                "speakers": podcast.speakers,
                "cover": podcast.cover,
                "dataPath": f"podcasts/{podcast.id}/",
                "knownEpisodeCount": len(catalog.episodes),
                "episodeCount": len(paths),
                "lastCheckedAt": max(
                    (item.fetched_at for item in catalog.snapshots), default=None
                ).isoformat()
                if catalog.snapshots
                else None,
                "episodeIds": [path.stem for path in paths],
                "source": str(destination / "source") if paths else None,
            }
        )
    result = {
        "schemaVersion": 1,
        "syntheticFixture": settings.synthetic_fixture,
        "podcasts": sources,
    }
    write_json(output / "sources.json", result)
    return result
