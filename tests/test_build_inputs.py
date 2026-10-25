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


def test_default_build_uses_selected_pilot_and_requires_saved_analysis(tmp_path):
    """An ordinary build publishes saved data, with no fallback or model loading."""
    data = tmp_path / "data/podcast-ufo"
    episodes = data / "episodes"
    analyses = data / "analyses"
    episodes.mkdir(parents=True)
    analyses.mkdir()
    entries = []
    for fixture in ("synthetic-episode.json", "search/second-episode.json"):
        episode = Episode.model_validate_json((ROOT / "tests/fixtures" / fixture).read_bytes())
        shutil.copyfile(ROOT / "tests/fixtures" / fixture, episodes / f"{episode.episode_id}.json")
        shutil.copyfile(
            ROOT / "tests/fixtures/analysis" / f"{episode.episode_id}.json",
            analyses / f"{episode.episode_id}.json",
        )
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
    web = tmp_path / "web"
    web.mkdir()
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
    missing = analyses / "synthetic-episode-001.json"
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
    assert "Missing or stale analysis for synthetic-episode-001" in failed.stdout + failed.stderr

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
    publication = json.loads((web / "dist/publication.json").read_bytes())
    assert publication["state"] == "selected-pilot"
    assert publication["episodeIds"] == ["synthetic-episode-001", "synthetic-episode-002"]
    assert publication["episodeCount"] == 2
    assert publication["archiveComplete"] is False

    # A saved source must be checked before it can be rebound to a web publication.
    prepared = tmp_path / ".cache/pilot-publication"
    vocabulary = json.loads((prepared / "stats/vocabulary.json").read_bytes())
    assert "ein" not in {word["lemma"] for word in vocabulary["words"]}
    statistics_manifest = json.loads((prepared / "stats/manifest.json").read_bytes())
    assert statistics_manifest["frequencyExclusions"] == {
        "automaticStopwords": "union-of-selected-analysis-flags",
        "ignoredLemmas": ["äh", "ähm"],
    }
    word = next(word for word in vocabulary["words"] if word["lemma"] == "hund")
    count_file = prepared / "stats" / word["shard"]
    valid_shard = json.loads(count_file.read_bytes())
    environment["PODCAST_WORDS_PUBLICATION_SOURCE"] = str(prepared)
    defects = [
        {**valid_shard, "schemaVersion": 1},
        {**valid_shard, "publicationId": "f" * 64},
        {**valid_shard, "counts": {"hund": [[2, 256]]}},
        {**valid_shard, "counts": {"hund": [[0, 256, 1]]}},
    ]
    for defective in defects:
        count_file.write_text(json.dumps(defective), encoding="utf-8")
        rejected = subprocess.run(
            command,
            cwd=ROOT,
            env=environment,
            capture_output=True,
            text=True,
            check=False,
            timeout=180,
        )
        assert rejected.returncode != 0, rejected.stdout + rejected.stderr
        assert any(
            message in rejected.stdout + rejected.stderr
            for message in ("statistics artifact", "Invalid lemma counts")
        )


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
    analyses = tmp_path / "analyses"
    analyses.mkdir()
    for name in ("synthetic-episode-001.json", "synthetic-episode-002.json"):
        shutil.copyfile(fixtures / "analysis" / name, analyses / name)
    output = tmp_path / "dist"
    npm = shutil.which("npm.cmd" if sys.platform == "win32" else "npm")
    assert npm is not None, "Node/npm is required for the public static build check"
    environment = {
        **os.environ,
        "UV_NO_SYNC": "1",
        "UV_PROJECT_ENVIRONMENT": sys.prefix,
        "PODCAST_WORDS_EPISODES": str(tmp_path / "episodes.json"),
        "PODCAST_WORDS_ANALYSES": str(analyses),
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
