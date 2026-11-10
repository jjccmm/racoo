"""Public static builds reject incompatible selected recognition configurations."""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from podcast_words.catalog import Catalog, CatalogEpisode, Enclosure
from podcast_words.contracts import Episode

ROOT = Path(__file__).resolve().parents[1]


def test_default_build_requires_transcripts_and_rejects_mismatched_metadata(tmp_path):
    """An ordinary build publishes saved data, with no fallback or model loading."""
    data = tmp_path / "data/podcast-ufo"
    episodes = data / "episodes"
    episodes.mkdir(parents=True)
    entries = []
    for fixture in ("synthetic-episode.json", "search/second-episode.json"):
        episode = Episode.model_validate_json((ROOT / "tests/fixtures" / fixture).read_bytes())
        shutil.copyfile(ROOT / "tests/fixtures" / fixture, episodes / f"{episode.episode_id}.json")
        entries.append(
            CatalogEpisode(
                episode_id=episode.episode_id,
                source=episode.source,
                title=episode.title,
                published_at=episode.published_at,
                enclosures=[Enclosure(url=episode.audio.url, media_type="audio/mpeg")],
                source_status="feed-listed",
                audio_availability="retrievable",
                processing_status="completed",
            )
        )
    (data / "catalog.json").write_text(
        Catalog(
            podcast_id="synthetic-podcast", feed_url="https://example.org/feed", episodes=entries
        ).model_dump_json(),
        encoding="utf-8",
    )
    (data / "pilot-episodes.json").write_text(
        json.dumps([f"episodes/{entry.episode_id}.json" for entry in entries]), encoding="utf-8"
    )
    (tmp_path / "podcasts.json").write_text(
        json.dumps(
            {
                "schema_version": 1,
                "podcasts": [
                    {
                        "id": "synthetic-podcast",
                        "name": "Synthetic podcast",
                        "speakers": ["Test"],
                        "cover": "images/podcast-ufo.jpg",
                        "feed_url": "https://example.org/feed",
                        "directory": "data/podcast-ufo",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    web = tmp_path / "web"
    web.mkdir()
    (web / "public/images").mkdir(parents=True)
    shutil.copyfile(
        ROOT / "web/public/images/podcast-ufo.jpg", web / "public/images/podcast-ufo.jpg"
    )
    (web / "index.html").write_text("<!doctype html><html><body>Pilot</body></html>")
    shutil.copyfile(ROOT / "pyproject.toml", tmp_path / "pyproject.toml")
    shutil.copyfile(ROOT / "uv.lock", tmp_path / "uv.lock")
    environment = {
        key: value for key, value in os.environ.items() if not key.startswith("PODCAST_WORDS_")
    }
    environment.update(
        UV_PROJECT_ENVIRONMENT=sys.prefix,
        UV_NO_SYNC="1",
        PYTHONPATH=str(ROOT / "src"),
    )
    npm = shutil.which("npm.cmd" if sys.platform == "win32" else "npm")
    assert npm is not None
    command = [
        npm,
        "--prefix",
        "web",
        "run",
        "build",
        "--",
        str(web),
        "--config",
        str(ROOT / "web/vite.config.ts"),
    ]
    missing = episodes / "synthetic-episode-001.json"
    saved = missing.read_bytes()
    missing.unlink()
    failed = subprocess.run(
        command,
        cwd=ROOT,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
        timeout=180,
    )
    assert failed.returncode != 0
    assert "synthetic-episode-001.json" in failed.stdout + failed.stderr

    missing.write_bytes(saved)
    result = subprocess.run(
        command,
        cwd=ROOT,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
        timeout=180,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    publication = json.loads(
        (web / "dist/podcasts/synthetic-podcast/publication.json").read_bytes()
    )
    assert publication["state"] == "published-corpus"
    assert publication["episodeIds"] == ["synthetic-episode-001", "synthetic-episode-002"]
    assert publication["episodeCount"] == 2
    assert publication["archiveComplete"] is False

    assert not (web / "dist/podcasts/synthetic-podcast/stats").exists()
    prepared = tmp_path / ".cache/site-publication/synthetic-podcast/source"
    catalog_path = prepared / "catalog.json"
    values = json.loads(catalog_path.read_bytes())
    values["episodes"][0]["title"] = "Wrong publication metadata"
    catalog_path.write_text(json.dumps(values), encoding="utf-8")
    environment["PODCAST_WORDS_PUBLICATION_SOURCE"] = str(prepared)
    rejected = subprocess.run(
        command, cwd=ROOT, env=environment, capture_output=True, text=True, check=False, timeout=180
    )
    assert rejected.returncode != 0
    assert "metadata catalog do not match" in rejected.stdout + rejected.stderr


def test_custom_episode_build_rejects_incompatible_recognition_configuration(tmp_path):
    fixtures = ROOT / "tests" / "fixtures"
    first = json.loads((fixtures / "synthetic-episode.json").read_bytes())
    second = json.loads((fixtures / "search" / "second-episode.json").read_bytes())
    second["transcription"]["model_revision"] = "deliberately-incompatible-fixture-model"
    (tmp_path / "first.json").write_text(json.dumps(first), encoding="utf-8")
    (tmp_path / "second.json").write_text(json.dumps(second), encoding="utf-8")
    (tmp_path / "episodes.json").write_text(
        json.dumps(["first.json", "second.json"]), encoding="utf-8"
    )
    output = tmp_path / "dist"
    npm = shutil.which("npm.cmd" if sys.platform == "win32" else "npm")
    assert npm is not None, "Node/npm is required for the public static build check"
    environment = {
        **os.environ,
        "UV_NO_SYNC": "1",
        "UV_PROJECT_ENVIRONMENT": sys.prefix,
        "PODCAST_WORDS_EPISODES": str(tmp_path / "episodes.json"),
    }
    environment.pop("PODCAST_WORDS_PUBLICATION_SOURCE", None)

    result = subprocess.run(
        [npm, "--prefix", "web", "run", "build", "--", "--outDir", str(output)],
        cwd=ROOT,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
        timeout=180,
    )

    assert result.returncode != 0, result.stdout + result.stderr
    assert "incompatible transcription configurations" in result.stdout + result.stderr
