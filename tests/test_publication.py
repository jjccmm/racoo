"""Transcript-only publication preserves identities, revisions and atomic outputs."""

import json
import shutil
import sys
from pathlib import Path

import pytest

from podcast_words.catalog import Catalog, CatalogEpisode, Enclosure
from podcast_words.cli import main
from podcast_words.contracts import Episode

ROOT = Path(__file__).parents[1]


def selected_inputs(tmp_path):
    directory = tmp_path / "inputs"
    episodes = directory / "episodes"
    episodes.mkdir(parents=True)
    entries = []
    for fixture in ["synthetic-episode.json", "search/second-episode.json"]:
        source = ROOT / "tests/fixtures" / fixture
        episode = Episode.model_validate_json(source.read_bytes())
        shutil.copyfile(source, episodes / f"{episode.episode_id}.json")
        entries.append(
            CatalogEpisode(
                episode_id=episode.episode_id,
                source=episode.source,
                title=episode.title,
                published_at=episode.published_at,
                enclosures=[Enclosure(url=episode.audio.url, media_type="audio/wav")],
                source_status="feed-listed",
                audio_availability="retrievable",
                processing_status="completed",
            )
        )
    catalog = directory / "catalog.json"
    catalog.write_text(
        Catalog(
            podcast_id="synthetic-podcast", feed_url="https://example.org/feed", episodes=entries
        ).model_dump_json(),
        encoding="utf-8",
    )
    corpus = directory / "episodes.json"
    corpus.write_text(
        json.dumps([f"episodes/{entry.episode_id}.json" for entry in entries]), encoding="utf-8"
    )
    return catalog, corpus, episodes


def publish(catalog, corpus, output):
    return main(
        ["publish", "--catalog", str(catalog), "--episodes", str(corpus), "--output", str(output)]
    )


def test_publication_works_without_nlp_and_preserves_text_times_and_provenance(
    tmp_path, capsys, monkeypatch
):
    catalog, corpus, originals = selected_inputs(tmp_path)
    before = {p.name: p.read_bytes() for p in originals.glob("*.json")}
    monkeypatch.setitem(sys.modules, "spacy", None)
    output = tmp_path / "publication"
    assert publish(catalog, corpus, output) == 0
    report = json.loads(capsys.readouterr().out)
    manifest = json.loads((output / "manifest.json").read_bytes())
    assert report["episodeCount"] == 2
    assert "analysis" not in report
    assert manifest["schemaVersion"] == 2
    assert manifest["state"] == "published-corpus"
    assert manifest["archiveComplete"] is False
    assert not (output / "stats").exists()
    public = json.loads((output / "episodes/synthetic-episode-001.json").read_bytes())
    original = json.loads(before["synthetic-episode-001.json"])
    assert public["segments"] == original["segments"]
    assert public["timings"] == original["timings"]
    assert public["transcription"]["transcript_revision"]
    assert public["transcription"]["configuration_revision"]
    entries = json.loads((output / "catalog.json").read_bytes())["episodes"]
    assert entries[0]["durationSeconds"] == original["audio"]["duration_seconds"]
    assert entries[0]["timings"]["downloadSeconds"] == original["timings"]["download_seconds"]
    assert before == {p.name: p.read_bytes() for p in originals.glob("*.json")}


def test_metadata_and_transcript_changes_rebind_publication_without_touching_originals(
    tmp_path, capsys
):
    catalog, corpus, originals = selected_inputs(tmp_path)
    output = tmp_path / "publication"
    assert publish(catalog, corpus, output) == 0
    capsys.readouterr()
    first = json.loads((output / "manifest.json").read_bytes())["preparationId"]
    data = json.loads(catalog.read_bytes())
    data["episodes"][0]["title"] = "Updated feed title"
    data["episodes"][0]["published_at"] = "2026-11-10T12:00:00Z"
    catalog.write_text(json.dumps(data), encoding="utf-8")
    before = {p.name: p.read_bytes() for p in originals.glob("*.json")}
    assert publish(catalog, corpus, output) == 0
    capsys.readouterr()
    second = json.loads((output / "manifest.json").read_bytes())["preparationId"]
    assert first != second
    public = json.loads((output / "episodes/synthetic-episode-001.json").read_bytes())
    assert public["title"] == "Updated feed title"
    assert public["published_at"].startswith("2026-11-10")
    assert before == {p.name: p.read_bytes() for p in originals.glob("*.json")}
    path = originals / "synthetic-episode-001.json"
    text = json.loads(path.read_bytes())
    text["segments"][0]["text"] += " Additional text."
    path.write_text(json.dumps(text), encoding="utf-8")
    assert publish(catalog, corpus, output) == 0
    assert json.loads((output / "manifest.json").read_bytes())["preparationId"] != second


@pytest.mark.parametrize(
    "defect", ["pending", "missing_entry", "foreign_identity", "mixed_model", "bad_revision"]
)
def test_invalid_inputs_preserve_previous_publication(tmp_path, capsys, defect):
    catalog, corpus, episodes = selected_inputs(tmp_path)
    output = tmp_path / "publication"
    assert publish(catalog, corpus, output) == 0
    capsys.readouterr()
    before = {str(p.relative_to(output)): p.read_bytes() for p in output.rglob("*") if p.is_file()}
    data = json.loads(catalog.read_bytes())
    if defect == "pending":
        data["episodes"][0]["processing_status"] = "not-processed"
    elif defect == "missing_entry":
        data["episodes"].pop()
    else:
        path = episodes / "synthetic-episode-001.json"
        record = json.loads(path.read_bytes())
        if defect == "foreign_identity":
            record["source"]["key"] = "unrelated-source"
        elif defect == "mixed_model":
            record["transcription"]["model_revision"] = "foreign-model"
        else:
            record["transcription"]["configuration_revision"] = "a" * 64
            record["transcription"]["transcript_revision"] = "b" * 64
        path.write_text(json.dumps(record), encoding="utf-8")
    catalog.write_text(json.dumps(data), encoding="utf-8")
    assert publish(catalog, corpus, output) == 1
    assert json.loads(capsys.readouterr().out)["ok"] is False
    assert before == {
        str(p.relative_to(output)): p.read_bytes() for p in output.rglob("*") if p.is_file()
    }


def test_unknown_destination_and_escaping_corpus_are_rejected(tmp_path, capsys):
    catalog, corpus, _ = selected_inputs(tmp_path)
    output = tmp_path / "publication"
    output.mkdir()
    sentinel = output / "user.txt"
    sentinel.write_text("keep me", encoding="utf-8")
    assert publish(catalog, corpus, output) == 1
    assert sentinel.read_text(encoding="utf-8") == "keep me"
    capsys.readouterr()
    corpus.write_text(json.dumps(["../outside.json"]), encoding="utf-8")
    assert publish(catalog, corpus, tmp_path / "other") == 1
    assert "inside" in json.loads(capsys.readouterr().out)["error"]
