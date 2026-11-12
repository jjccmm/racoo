"""Generate three configured podcasts for offline built-site checks only."""

import argparse
import json
from datetime import datetime
from pathlib import Path

from podcast_words.catalog import Catalog, CatalogEpisode, Enclosure, Snapshot
from podcast_words.contracts import Episode
from podcast_words.json_io import write_json

ROOT = Path(__file__).resolve().parents[1]


def create_fixture(output: Path) -> Path:
    podcasts = []
    for identity, name, fixture, count in [
        ("podcast-ufo", "DAS PODCAST UFO", "synthetic-episode.json", 3),
        ("second-podcast", "Zweiter Testpodcast", "search/second-episode.json", 1),
        ("empty-podcast", "Noch ohne Transkript", None, 0),
    ]:
        directory = output / "data" / identity
        directory.mkdir(parents=True, exist_ok=True)
        entries = []
        if fixture:
            values = json.loads((ROOT / "tests/fixtures" / fixture).read_bytes())
            values["podcast_id"] = identity
            if identity == "second-podcast":
                values["episode_id"] = "second-episode"
                values["title"] = "Nur im zweiten Podcast"
            episode = Episode.model_validate_json(json.dumps(values))
            write_json(
                directory / "episodes" / f"{episode.episode_id}.json",
                episode.model_dump(mode="json"),
            )
            entry = CatalogEpisode(
                episode_id=episode.episode_id,
                source=episode.source,
                title=episode.title,
                published_at=episode.published_at,
                enclosures=[Enclosure(url=episode.audio.url, media_type="audio/mpeg")],
                source_status="feed-listed",
                processing_status="completed",
            )
            entries.append(entry)
            for index in range(count - 1):
                extra = entry.model_copy(deep=True)
                extra.episode_id = f"pending-{index}"
                extra.source.key = extra.source.guid = f"pending-{identity}-{index}"
                extra.processing_status = "not-processed"
                entries.append(extra)
        catalog = Catalog(
            podcast_id=identity,
            feed_url="https://example.org/feed",
            episodes=entries,
            snapshots=[
                Snapshot(
                    fetched_at=datetime.fromisoformat("2026-11-08T12:00:00+00:00"),
                    requested_url="https://example.org/feed",
                    resolved_url="https://example.org/feed",
                    sha256="a" * 64,
                    path="snapshots/fixture.xml",
                    item_count=count,
                )
            ],
        )
        write_json(directory / "catalog.json", catalog.model_dump(mode="json"))
        podcasts.append(
            {
                "id": identity,
                "name": name,
                "speakers": ["Florentin Will", "Stefan Titze"]
                if identity == "podcast-ufo"
                else ["Testsprecher"],
                "cover": "images/podcast-ufo.jpg",
                "website_url": f"https://example.org/{identity}",
                "feed_url": "https://example.org/feed",
                "directory": f"data/{identity}",
            }
        )
    path = output / "podcasts.json"
    write_json(path, {"schema_version": 1, "synthetic_fixture": True, "podcasts": podcasts})
    return path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    print(create_fixture(parser.parse_args().output))
