"""Transferred result import is observed through the public CLI and saved artifacts."""

import json
from datetime import UTC, datetime
from pathlib import Path

from podcast_words.catalog import Catalog, CatalogEpisode, Enclosure, IdentityVerification, Source
from podcast_words.cli import main
from podcast_words.contracts import Episode

FIXTURE = Path(__file__).parent / "fixtures" / "synthetic-episode.json"


def make_catalog(path: Path, *, alias: bool = False) -> None:
    source = Source(
        kind="rss",
        key="guid-one",
        guid="current-guid" if alias else "guid-one",
        guid_aliases=["guid-one"] if alias else [],
        reference_url="https://example.org/episode",
    )
    entry = CatalogEpisode(
        episode_id="episode-one",
        source=source,
        title="Current catalog title",
        published_at=datetime(2026, 10, 16, tzinfo=UTC),
        enclosures=[Enclosure(url="https://example.org/current.mp3", media_type="audio/mpeg")],
        source_status="feed-listed",
        audio_availability="retrievable",
        identity_verifications=(
            [
                IdentityVerification(
                    guid="guid-one",
                    checked_at=datetime(2026, 10, 17, tzinfo=UTC),
                    note="same episode",
                )
            ]
            if alias
            else []
        ),
    )
    catalog = Catalog(
        podcast_id="synthetic-podcast",
        feed_url="https://example.org/feed",
        episodes=[entry],
    )
    path.write_text(catalog.model_dump_json(indent=2) + "\n", encoding="utf-8")


def incoming_episode(*, title: str = "Transferred title") -> Episode:
    values = json.loads(FIXTURE.read_bytes())
    values.update(
        podcast_id="synthetic-podcast",
        episode_id="episode-one",
        title=title,
        source={
            "kind": "rss",
            "key": "guid-one",
            "reference_url": "https://example.org/episode",
            "guid": "guid-one",
            "guid_aliases": [],
        },
    )
    return Episode.model_validate_json(json.dumps(values))


def run_import(catalog: Path, incoming: Path, output: Path) -> int:
    return main(
        [
            "import-results",
            "--catalog",
            str(catalog),
            "--input-dir",
            str(incoming),
            "--output-dir",
            str(output),
        ]
    )


def put_incoming(directory: Path, episode: Episode) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "episode-one.json"
    path.write_text(episode.model_dump_json(indent=2) + "\n", encoding="utf-8")
    return path


def test_import_accepts_catalog_identity_and_repeat_skips_without_changing_bytes(tmp_path, capsys):
    catalog = tmp_path / "catalog.json"
    incoming = tmp_path / "transfer"
    output = tmp_path / "episodes"
    make_catalog(catalog)
    put_incoming(incoming, incoming_episode())

    assert run_import(catalog, incoming, output) == 0
    first_report = json.loads(capsys.readouterr().out)
    saved = (output / "episode-one.json").read_bytes()
    saved_episode = Episode.model_validate_json(saved)
    assert first_report["ok"] is True
    assert first_report["results"][0]["status"] == "accepted"
    assert "title" in first_report["results"][0]["catalog_metadata_mismatches"]
    assert "audio_url" in first_report["results"][0]["catalog_metadata_mismatches"]
    assert saved_episode.segments[0].text == "Ein Eimer voller Münzen steht neben dem Tisch."
    assert (
        saved_episode.transcription.runtime_versions
        == incoming_episode().transcription.runtime_versions
    )
    assert saved_episode.title == "Transferred title"
    assert first_report["results"][0]["revisions"]["input_revision"] == saved_episode.audio.sha256
    assert first_report["results"][0]["revisions"]["configuration_revision"]
    assert first_report["results"][0]["revisions"]["transcript_revision"]
    assert json.loads(catalog.read_bytes())["episodes"][0]["processing_status"] == "completed"

    assert run_import(catalog, incoming, output) == 0
    second_report = json.loads(capsys.readouterr().out)
    assert second_report["results"][0]["status"] == "skipped"
    assert (output / "episode-one.json").read_bytes() == saved


def test_import_accepts_saved_guid_when_catalog_verifies_it_as_alias(tmp_path, capsys):
    catalog = tmp_path / "catalog.json"
    incoming = tmp_path / "transfer"
    output = tmp_path / "episodes"
    make_catalog(catalog, alias=True)
    put_incoming(incoming, incoming_episode())

    assert run_import(catalog, incoming, output) == 0
    report = json.loads(capsys.readouterr().out)
    assert report["results"][0]["status"] == "accepted"
    assert report["results"][0]["identity_match"] == "verified-guid-alias"


def test_invalid_incomplete_and_unassigned_results_are_reported_without_writes(tmp_path, capsys):
    catalog = tmp_path / "catalog.json"
    incoming = tmp_path / "transfer"
    output = tmp_path / "episodes"
    make_catalog(catalog)
    put_incoming(incoming, incoming_episode())
    malformed = incoming / "broken.json"
    malformed.write_text('{"schema_version": 1}', encoding="utf-8")

    assert run_import(catalog, incoming, output) == 1
    report = json.loads(capsys.readouterr().out)
    assert report["ok"] is False
    assert {result["status"] for result in report["results"]} == {"rejected", "accepted"}
    assert any(result.get("path", "").endswith("broken.json") for result in report["results"])


def test_different_transcript_or_audio_is_a_conflict_and_keeps_existing_bytes(tmp_path, capsys):
    catalog = tmp_path / "catalog.json"
    incoming = tmp_path / "transfer"
    output = tmp_path / "episodes"
    make_catalog(catalog)
    destination = output / "episode-one.json"
    destination.parent.mkdir(parents=True)
    existing = incoming_episode()
    destination.write_text(existing.model_dump_json(indent=2) + "\n", encoding="utf-8")
    before = destination.read_bytes()

    changed = incoming_episode(title="Different metadata")
    changed = changed.model_copy(
        update={
            "segments": [
                changed.segments[0].model_copy(update={"text": "Changed recognized text."}),
                changed.segments[1],
            ]
        }
    )
    put_incoming(incoming, changed)
    assert run_import(catalog, incoming, output) == 1
    report = json.loads(capsys.readouterr().out)
    assert report["results"][0]["status"] == "conflict"
    assert "transcript" in report["results"][0]["conflicts"]
    assert destination.read_bytes() == before

    changed_audio_values = json.loads(existing.model_dump_json())
    changed_audio_values["audio"]["sha256"] = "1" * 64
    put_incoming(incoming, Episode.model_validate_json(json.dumps(changed_audio_values)))
    assert run_import(catalog, incoming, output) == 1
    audio_report = json.loads(capsys.readouterr().out)
    assert "audio" in audio_report["results"][0]["conflicts"]
    assert destination.read_bytes() == before


def test_legacy_complete_provenance_is_imported_and_partial_revisions_rejected(tmp_path, capsys):
    catalog = tmp_path / "catalog.json"
    incoming = tmp_path / "transfer"
    output = tmp_path / "episodes"
    make_catalog(catalog)
    legacy = json.loads(incoming_episode().model_dump_json())
    for field in ("input_revision", "configuration_revision", "transcript_revision"):
        legacy["transcription"].pop(field, None)
    put_incoming(incoming, Episode.model_validate_json(json.dumps(legacy)))

    assert run_import(catalog, incoming, output) == 0
    report = json.loads(capsys.readouterr().out)
    assert report["results"][0]["legacy_provenance"] == "complete-without-revision-fields"

    broken = json.loads((output / "episode-one.json").read_bytes())
    broken["transcription"]["input_revision"] = broken["audio"]["sha256"]
    put_incoming(incoming, Episode.model_validate_json(json.dumps(broken)))
    assert run_import(catalog, incoming, output) == 1
    rejected = json.loads(capsys.readouterr().out)
    assert rejected["results"][0]["status"] == "rejected"


def test_unverified_identity_and_semantically_invalid_result_are_rejected(tmp_path, capsys):
    catalog = tmp_path / "catalog.json"
    incoming = tmp_path / "transfer"
    output = tmp_path / "episodes"
    make_catalog(catalog)
    foreign = json.loads(incoming_episode().model_dump_json())
    foreign["source"]["guid"] = "unverified-guid"
    put_incoming(incoming, Episode.model_validate_json(json.dumps(foreign)))
    invalid = json.loads(incoming_episode().model_dump_json())
    invalid["segments"][0]["end_seconds"] = 91
    (incoming / "invalid.json").write_text(json.dumps(invalid), encoding="utf-8")
    incomplete = json.loads(incoming_episode().model_dump_json())
    incomplete["transcription"].pop("runtime_versions")
    (incoming / "incomplete.json").write_text(json.dumps(incomplete), encoding="utf-8")
    empty = json.loads(incoming_episode().model_dump_json())
    empty["segments"] = []
    (incoming / "empty.json").write_text(json.dumps(empty), encoding="utf-8")

    assert run_import(catalog, incoming, output) == 1
    report = json.loads(capsys.readouterr().out)
    assert all(result["status"] == "rejected" for result in report["results"])
    assert not output.exists()
    assert json.loads(catalog.read_bytes())["episodes"][0]["processing_status"] == "not-processed"


def test_metadata_drift_and_config_conflict_preserve_recognition(tmp_path, capsys):
    catalog = tmp_path / "catalog.json"
    incoming = tmp_path / "transfer"
    output = tmp_path / "episodes"
    make_catalog(catalog)
    destination = output / "episode-one.json"
    destination.parent.mkdir(parents=True)
    original = incoming_episode(title="Earlier title")
    destination.write_text(original.model_dump_json(indent=2), encoding="utf-8")
    before = destination.read_bytes()
    put_incoming(incoming, incoming_episode(title="Newer title"))

    assert run_import(catalog, incoming, output) == 0
    report = json.loads(capsys.readouterr().out)
    assert report["results"][0]["status"] == "skipped"
    assert report["results"][0]["metadata_mismatches"] == ["title"]
    assert destination.read_bytes() == before

    changed_config = json.loads(original.model_dump_json())
    changed_config["transcription"]["model_revision"] = "different-model-revision"
    put_incoming(incoming, Episode.model_validate_json(json.dumps(changed_config)))
    assert run_import(catalog, incoming, output) == 1
    config_report = json.loads(capsys.readouterr().out)
    assert "configuration" in config_report["results"][0]["conflicts"]
    assert destination.read_bytes() == before


def test_existing_identity_conflict_is_reported_and_preserved(tmp_path, capsys):
    catalog = tmp_path / "catalog.json"
    incoming = tmp_path / "transfer"
    output = tmp_path / "episodes"
    make_catalog(catalog)
    put_incoming(incoming, incoming_episode())
    destination = output / "episode-one.json"
    destination.parent.mkdir(parents=True)
    foreign = incoming_episode().model_copy(update={"episode_id": "foreign-episode"})
    destination.write_text(foreign.model_dump_json(indent=2), encoding="utf-8")
    before = destination.read_bytes()

    assert run_import(catalog, incoming, output) == 1
    report = json.loads(capsys.readouterr().out)
    assert report["results"][0]["status"] == "conflict"
    assert "identity" in report["results"][0]["conflicts"]
    assert destination.read_bytes() == before
