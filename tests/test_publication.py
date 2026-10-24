"""Publication preparation is verified through the shared public CLI."""

import hashlib
import json
import shutil
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import ClassVar

import pytest

from podcast_words.catalog import Catalog, CatalogEpisode, Enclosure
from podcast_words.cli import main
from podcast_words.contracts import Episode

ROOT = Path(__file__).parents[1]


def selected_inputs(tmp_path, *, titles=None, processing_status="completed"):
    source_dir = tmp_path / "inputs"
    episode_dir = source_dir / "episodes"
    episode_dir.mkdir(parents=True)
    analysis_dir = source_dir / "analyses"
    analysis_dir.mkdir()
    fixtures = [
        ROOT / "tests/fixtures/synthetic-episode.json",
        ROOT / "tests/fixtures/search/second-episode.json",
    ]
    catalog_episodes = []
    manifest_paths = []
    for index, fixture in enumerate(fixtures):
        episode = Episode.model_validate_json(fixture.read_bytes())
        title = titles[index] if titles else episode.title
        saved_path = episode_dir / f"{episode.episode_id}.json"
        shutil.copyfile(fixture, saved_path)
        analysis_fixture = ROOT / "tests/fixtures/analysis" / f"{episode.episode_id}.json"
        shutil.copyfile(analysis_fixture, analysis_dir / analysis_fixture.name)
        manifest_paths.append(f"episodes/{saved_path.name}")
        catalog_episodes.append(
            CatalogEpisode(
                episode_id=episode.episode_id,
                source=episode.source,
                title=title,
                published_at=episode.published_at,
                episode_number=episode.episode_number,
                webpage_url=episode.webpage_url,
                enclosures=[Enclosure(url=episode.audio.url, media_type="audio/wav")],
                source_status="feed-listed",
                audio_availability="retrievable",
                processing_status=processing_status,
            )
        )
    catalog_path = source_dir / "catalog.json"
    Catalog(
        podcast_id="synthetic-podcast",
        feed_url="https://example.org/feed",
        episodes=catalog_episodes,
    ).model_dump_json()
    catalog_path.write_text(
        Catalog(
            podcast_id="synthetic-podcast",
            feed_url="https://example.org/feed",
            episodes=catalog_episodes,
        ).model_dump_json(indent=2)
        + "\n",
        encoding="utf-8",
    )
    corpus_path = source_dir / "episodes.json"
    corpus_path.write_text(json.dumps(manifest_paths), encoding="utf-8")
    return catalog_path, corpus_path, analysis_dir, episode_dir


def publish(catalog, corpus, analyses, output, *options):
    return main(
        [
            "publish",
            "--catalog",
            str(catalog),
            "--episodes",
            str(corpus),
            "--analyses",
            str(analyses),
            "--output",
            str(output),
            *map(str, options),
        ]
    )


def test_publish_prepares_one_selected_publication_and_preserves_transcript_content(
    tmp_path, capsys
):
    catalog, corpus, analyses, originals = selected_inputs(tmp_path)
    output = tmp_path / "publication"
    first_original = originals / "synthetic-episode-001.json"
    original_bytes = first_original.read_bytes()

    assert publish(catalog, corpus, analyses, output) == 0
    report = json.loads(capsys.readouterr().out)
    manifest = json.loads((output / "manifest.json").read_bytes())
    assert manifest["state"] == "selected-pilot"
    assert manifest["archiveComplete"] is False
    assert len(manifest["episodeIds"]) == 2
    assert report["analysis"]["reused"] == manifest["episodeIds"]
    assert len(list((output / "stats/counts").glob("*.json"))) == 64
    public_episode = json.loads((output / "episodes/synthetic-episode-001.json").read_bytes())
    original = json.loads(original_bytes)
    assert public_episode["segments"] == original["segments"]
    assert "input_revision" not in public_episode["transcription"]
    assert public_episode["transcription"]["transcript_revision"]
    assert public_episode["transcription"]["configuration_revision"]
    assert manifest["derivedRevisionEpisodeIds"] == manifest["episodeIds"]
    assert first_original.read_bytes() == original_bytes
    assert len(json.loads((output / "catalog.json").read_bytes())["episodes"]) == 2


def test_publish_metadata_only_refresh_reuses_analysis_and_updates_public_metadata(
    tmp_path, capsys
):
    catalog, corpus, analyses, originals = selected_inputs(tmp_path)
    output = tmp_path / "publication"
    assert publish(catalog, corpus, analyses, output) == 0
    original_episode_bytes = (originals / "synthetic-episode-001.json").read_bytes()
    capsys.readouterr()
    before = json.loads((output / "manifest.json").read_bytes())["preparationId"]
    previous = json.loads((output / "episodes/synthetic-episode-001.json").read_bytes())
    previous_analysis = (analyses / "synthetic-episode-001.json").read_bytes()

    catalog_data = json.loads(catalog.read_bytes())
    catalog_data["episodes"][0]["title"] = "Catalog title after feed refresh"
    catalog_data["episodes"][0]["published_at"] = "2026-10-18T12:00:00Z"
    catalog.write_text(json.dumps(catalog_data), encoding="utf-8")
    assert publish(catalog, corpus, analyses, output) == 0
    report = json.loads(capsys.readouterr().out)
    after = json.loads((output / "manifest.json").read_bytes())["preparationId"]
    public_episode = json.loads((output / "episodes/synthetic-episode-001.json").read_bytes())
    assert before != after
    assert report["analysis"]["computed"] == []
    assert public_episode["title"] == "Catalog title after feed refresh"
    assert public_episode["published_at"] == "2026-10-18T12:00:00Z"
    assert public_episode["segments"] == previous["segments"]
    assert public_episode["audio"] == previous["audio"]
    assert (analyses / "synthetic-episode-001.json").read_bytes() == previous_analysis
    assert (originals / "synthetic-episode-001.json").read_bytes() == original_episode_bytes


def test_publish_rejects_incomplete_and_incompatible_transcription_sets(tmp_path, capsys):
    catalog, corpus, analyses, _ = selected_inputs(tmp_path, processing_status="failed")
    output = tmp_path / "publication"
    assert publish(catalog, corpus, analyses, output) == 1
    assert "not completed" in json.loads(capsys.readouterr().out)["error"]
    assert not output.exists()

    catalog, corpus, analyses, episodes = selected_inputs(tmp_path / "mixed")
    second = episodes / "synthetic-episode-002.json"
    data = json.loads(second.read_bytes())
    data["transcription"]["model_revision"] = "incompatible-revision"
    second.write_text(json.dumps(data), encoding="utf-8")
    output = tmp_path / "mixed-publication"
    assert publish(catalog, corpus, analyses, output) == 1
    assert (
        "incompatible transcription configurations" in json.loads(capsys.readouterr().out)["error"]
    )


def test_publish_preserves_processing_revisions_and_only_derives_legacy_omissions(tmp_path, capsys):
    catalog, corpus, analyses, episodes = selected_inputs(tmp_path)
    config_revision = "a" * 64
    expected_revisions = {}
    for transcript in episodes.glob("*.json"):
        data = json.loads(transcript.read_bytes())
        data["transcription"]["configuration_revision"] = config_revision
        episode = Episode.model_validate_json(json.dumps(data))
        consumed = {
            "segments": [segment.model_dump(mode="json") for segment in episode.segments],
            "configuration_revision": config_revision,
        }
        data["transcription"]["transcript_revision"] = hashlib.sha256(
            json.dumps(consumed, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
        ).hexdigest()
        expected_revisions[transcript.stem] = data["transcription"]["transcript_revision"]
        transcript.write_text(json.dumps(data), encoding="utf-8")
    output = tmp_path / "publication"
    assert publish(catalog, corpus, analyses, output) == 0
    report = json.loads(capsys.readouterr().out)
    revisions = json.loads((output / "episodes/synthetic-episode-001.json").read_bytes())[
        "transcription"
    ]
    assert revisions["configuration_revision"] == config_revision
    assert revisions["transcript_revision"] == expected_revisions["synthetic-episode-001"]
    assert json.loads((output / "manifest.json").read_bytes())["derivedRevisionEpisodeIds"] == []
    assert report["analysis"]["computed"] == []


def test_publish_keeps_per_episode_execution_provenance_without_calling_it_mixed_asr(
    tmp_path, capsys
):
    catalog, corpus, analyses, episodes = selected_inputs(tmp_path)
    second = episodes / "synthetic-episode-002.json"
    data = json.loads(second.read_bytes())
    data["transcription"]["runtime_versions"]["onnxruntime"] = "GPU build"
    data["transcription"]["execution_providers"] = {
        "CUDAExecutionProvider": ["CUDAExecutionProvider"]
    }
    second.write_text(json.dumps(data), encoding="utf-8")
    output = tmp_path / "publication"

    assert publish(catalog, corpus, analyses, output) == 0
    capsys.readouterr()
    first = json.loads((output / "episodes/synthetic-episode-001.json").read_bytes())[
        "transcription"
    ]
    second_transcription = json.loads(
        (output / "episodes/synthetic-episode-002.json").read_bytes()
    )["transcription"]
    assert first["configuration_revision"] != second_transcription["configuration_revision"]
    assert first["runtime_versions"] != second_transcription["runtime_versions"]
    assert second_transcription["execution_providers"] == {
        "CUDAExecutionProvider": ["CUDAExecutionProvider"]
    }


def test_publish_invalidates_only_the_analysis_whose_transcript_changed(
    tmp_path, capsys, monkeypatch
):
    catalog, corpus, analyses, episodes = selected_inputs(tmp_path)
    output = tmp_path / "publication"
    first = episodes / "synthetic-episode-001.json"
    data = json.loads(first.read_bytes())
    data["segments"][0]["text"] += " Hunde."
    first.write_text(json.dumps(data), encoding="utf-8")

    package = ModuleType("spacy")
    package.__version__ = "3.8.16"

    class Model:
        meta: ClassVar[dict[str, str]] = {"version": "3.8.0"}

        def __call__(self, text):
            return [
                SimpleNamespace(is_alpha=True, lemma_=word.lower(), is_stop=False)
                for word in text.split()
                if word.isalpha()
            ]

    package.load = lambda _name: Model()
    monkeypatch.setitem(sys.modules, "spacy", package)
    assert publish(catalog, corpus, analyses, output) == 0
    report = json.loads(capsys.readouterr().out)
    assert report["analysis"]["computed"] == ["synthetic-episode-001"]
    assert report["analysis"]["reused"] == ["synthetic-episode-002"]
    assert (
        json.loads((analyses / "synthetic-episode-001.json").read_bytes())["input_sha256"]
        != (
            json.loads((ROOT / "tests/fixtures/analysis/synthetic-episode-001.json").read_bytes())[
                "input_sha256"
            ]
        )
    )


def test_analysis_version_change_recomputes_counts_without_retranscribing(
    tmp_path, capsys, monkeypatch
):
    catalog, corpus, analyses, episodes = selected_inputs(tmp_path)
    originals = {path.name: json.loads(path.read_bytes()) for path in episodes.glob("*.json")}
    package = ModuleType("spacy")
    package.__version__ = "3.8.16"

    class Model:
        meta: ClassVar[dict[str, str]] = {"version": "3.8.0"}

        def __call__(self, text):
            return [
                SimpleNamespace(is_alpha=True, lemma_=word.lower(), is_stop=False)
                for word in text.split()
                if word.isalpha()
            ]

    package.load = lambda _name: Model()
    monkeypatch.setitem(sys.modules, "spacy", package)
    output = tmp_path / "publication"
    assert publish(catalog, corpus, analyses, output, "--analysis-version", "2") == 0
    report = json.loads(capsys.readouterr().out)
    assert report["analysis"]["computed"] == sorted(Path(name).stem for name in originals)
    assert report["analysis"]["reused"] == []
    assert all(
        json.loads(path.read_bytes()) == originals[path.name] for path in episodes.glob("*.json")
    )
    assert json.loads((output / "manifest.json").read_bytes())["analysisVersion"] == "2"


@pytest.mark.parametrize("defect", ["missing_catalog_entry", "foreign_episode_identity"])
def test_publish_rejects_mismatched_catalog_and_transcript_inputs(tmp_path, capsys, defect):
    catalog, corpus, analyses, episodes = selected_inputs(tmp_path)
    catalog_data = json.loads(catalog.read_bytes())
    if defect == "missing_catalog_entry":
        catalog_data["episodes"].pop()
    else:
        transcript_path = episodes / "synthetic-episode-001.json"
        transcript = json.loads(transcript_path.read_bytes())
        transcript["source"]["key"] = "unrelated-source-key"
        transcript["source"]["guid"] = "unrelated-source-key"
        transcript_path.write_text(json.dumps(transcript), encoding="utf-8")
    catalog.write_text(json.dumps(catalog_data), encoding="utf-8")
    output = tmp_path / "publication"
    assert publish(catalog, corpus, analyses, output) == 1
    assert json.loads(capsys.readouterr().out)["ok"] is False
    assert not output.exists()
