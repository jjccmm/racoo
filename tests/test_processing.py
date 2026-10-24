"""Selected processing is exercised through the public CLI and external boundaries."""

import json
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace

import onnx_asr
from asr_fixtures import audio_server, install_external_recognizer, wave_bytes

from podcast_words import transcribe
from podcast_words.catalog import Catalog, CatalogEpisode, Enclosure, Source
from podcast_words.cli import main
from podcast_words.contracts import Episode


def make_catalog(path, audio_url, title="Fixture episode"):
    catalog = Catalog(
        podcast_id="fixture-podcast",
        feed_url="https://example.org/feed",
        episodes=[
            CatalogEpisode(
                episode_id="episode-one",
                source=Source(
                    kind="rss",
                    key="guid-one",
                    guid="guid-one",
                    reference_url="https://example.org/episode",
                ),
                title=title,
                published_at=datetime(2026, 10, 16, tzinfo=UTC),
                webpage_url="https://example.org/episode",
                enclosures=[Enclosure(url=audio_url, media_type="audio/wav")],
                source_status="feed-listed",
                audio_availability="retrievable",
            ),
            CatalogEpisode(
                episode_id="episode-two",
                source=Source(
                    kind="rss",
                    key="guid-two",
                    guid="guid-two",
                    reference_url="https://example.org/episode-two",
                ),
                title="Unselected episode",
                published_at=datetime(2026, 10, 17, tzinfo=UTC),
                enclosures=[Enclosure(url=audio_url, media_type="audio/wav")],
                source_status="feed-listed",
                audio_availability="retrievable",
            ),
        ],
    )
    path.write_text(catalog.model_dump_json(indent=2) + "\n", encoding="utf-8")


def run(
    catalog,
    output,
    cache,
    *episode_ids,
    retranscribe=False,
    run_report=None,
):
    args = [
        "process",
        "--catalog",
        str(catalog),
        "--output-dir",
        str(output),
        "--cache-dir",
        str(cache),
    ]
    for episode_id in episode_ids:
        args.extend(["--episode-id", episode_id])
    if retranscribe:
        args.append("--retranscribe")
    if run_report:
        args.extend(["--run-report", str(run_report)])
    return main(args)


def test_process_selected_episode_is_durable_skipped_on_resume_and_explicitly_retranscribed(
    tmp_path, monkeypatch, capsys
):
    audio = wave_bytes()
    catalog_path = tmp_path / "catalog.json"
    output = tmp_path / "episodes"
    cache = tmp_path / "cache"
    with audio_server(audio) as (audio_url, response):
        make_catalog(catalog_path, audio_url)
        install_external_recognizer(monkeypatch, tmp_path)
        output.mkdir(parents=True)
        (output / "episode-one.json").write_bytes(b"{partial")

        assert run(catalog_path, output, cache, "episode-one") == 0
        first = json.loads((output / "episode-one.json").read_bytes())
        assert first["segments"][0]["text"] == "Known words."
        assert first["schema_version"] == 2
        assert set(first["audio"]) == {"url", "duration_seconds"}
        assert "input_revision" not in first["transcription"]
        assert set(first["segments"][0]) == {"id", "text", "start_seconds", "end_seconds"}
        assert set(first["timings"]) == {
            "download_seconds",
            "transcription_seconds",
            "total_seconds",
        }
        assert first["timings"]["download_seconds"] >= 0
        assert first["timings"]["transcription_seconds"] >= 0
        assert first["timings"]["total_seconds"] >= first["timings"]["transcription_seconds"]
        assert not list((cache / "audio").iterdir())
        assert first["transcription"]["configuration_revision"]
        assert first["transcription"]["transcript_revision"]
        assert (
            json.loads(catalog_path.read_bytes())["episodes"][0]["processing_status"] == "completed"
        )
        captured = capsys.readouterr()
        initial_output = captured.out
        assert "episode-one" in captured.err
        assert "audio duration" in captured.err
        assert "total" in captured.err
        assert "download s/audio min" in captured.err
        assert "transcription s/audio min" in captured.err

        assert response["requests"] == 1
        response["status"] = 503
        response["body"] = wave_bytes(6)

        def no_model_on_resume(*_args, **_kwargs):
            raise AssertionError("a saved transcript must not initialize ASR")

        with monkeypatch.context() as resume_patch:
            resume_patch.setattr(onnx_asr, "load_model", no_model_on_resume)
            assert run(catalog_path, output, cache, "episode-one") == 0
        resumed = json.loads(capsys.readouterr().out)
        assert resumed["results"][0]["status"] == "skipped"
        assert resumed["results"][0]["timings"] == first["timings"]
        assert response["requests"] == 1
        assert (output / "episode-two.json").exists() is False
        assert (output / "episode-one.json").read_text() == json.dumps(
            first, indent=2, ensure_ascii=False
        ) + "\n"

        make_catalog(catalog_path, audio_url, title="Updated title")
        assert run(catalog_path, output, cache, "episode-one") == 0
        drift = json.loads(capsys.readouterr().out)["results"][0]
        assert drift["status"] == "skipped"
        assert "title" in drift["metadata_mismatches"]
        assert json.loads((output / "episode-one.json").read_bytes())["title"] == "Fixture episode"

        monkeypatch.setattr(transcribe, "MODEL_REVISION", "new-pinned-revision")
        assert run(catalog_path, output, cache, "episode-one") == 0
        config_drift = json.loads(capsys.readouterr().out)["results"][0]
        assert config_drift["status"] == "skipped"
        assert "model_revision" in config_drift["configuration_mismatches"]

        previous_artifact = (output / "episode-one.json").read_bytes()
        response["status"] = 503
        assert run(catalog_path, output, cache, "episode-one", retranscribe=True) == 1
        failed_retry = json.loads(capsys.readouterr().out)["results"][0]
        assert failed_retry["status"] == "failed"
        assert (output / "episode-one.json").read_bytes() == previous_artifact

        response["status"] = 200
        assert run(catalog_path, output, cache, "episode-one", retranscribe=True) == 0
        replacement = json.loads((output / "episode-one.json").read_bytes())
        assert replacement["title"] == "Updated title"
        assert replacement["segments"] == first["segments"]
        assert replacement["audio"]["duration_seconds"] == 6
        assert not list((cache / "audio").iterdir())
        assert json.loads(capsys.readouterr().out)["results"][0]["status"] == "completed"
        assert json.loads(initial_output)["results"][0]["status"] == "completed"


def test_process_run_report_cannot_alias_catalog_before_any_processing(
    tmp_path, monkeypatch, capsys
):
    catalog_path = tmp_path / "catalog.json"
    output = tmp_path / "episodes"
    with audio_server(wave_bytes()) as (audio_url, _response):
        make_catalog(catalog_path, audio_url)
        original_catalog = catalog_path.read_bytes()

        def should_not_initialize(*_args, **_kwargs):
            raise AssertionError("run report path collision must fail before ASR setup")

        monkeypatch.setattr(onnx_asr, "load_model", should_not_initialize)
        assert (
            run(
                catalog_path,
                output,
                tmp_path / "cache",
                "episode-one",
                run_report=catalog_path,
            )
            == 1
        )
    assert json.loads(capsys.readouterr().out)["ok"] is False
    assert catalog_path.read_bytes() == original_catalog
    assert not output.exists()


def test_process_rejects_stale_or_partial_revisions_without_marking_completion(tmp_path, capsys):
    fixture = Path(__file__).parent / "fixtures" / "synthetic-episode.json"
    original = json.loads(fixture.read_bytes())
    original["podcast_id"] = "fixture-podcast"
    original["episode_id"] = "episode-one"
    original["source"] = {
        "kind": "rss",
        "key": "guid-one",
        "guid": "guid-one",
        "guid_aliases": [],
        "reference_url": "https://example.org/episode",
    }

    mutations = {
        "stale-transcript": {
            "configuration_revision": "1" * 64,
            "transcript_revision": "2" * 64,
        },
        "partial": {
            "configuration_revision": "1" * 64,
            "transcript_revision": None,
        },
    }

    for name, revisions in mutations.items():
        catalog_path = tmp_path / f"{name}-catalog.json"
        output = tmp_path / f"{name}-episodes"
        make_catalog(catalog_path, "https://audio.example/episode.wav")
        catalog_data = json.loads(catalog_path.read_bytes())
        catalog_data["episodes"][0]["processing_status"] = "completed"
        catalog_path.write_text(json.dumps(catalog_data), encoding="utf-8")
        saved = json.loads(json.dumps(original))
        saved["transcription"].update(revisions)
        destination = output / "episode-one.json"
        destination.parent.mkdir()
        destination.write_text(json.dumps(saved), encoding="utf-8")
        previous = destination.read_bytes()

        assert run(catalog_path, output, tmp_path / "cache", "episode-one") == 1
        report = json.loads(capsys.readouterr().out)
        assert report["results"][0]["status"] == "conflict"
        assert destination.read_bytes() == previous
        assert json.loads(catalog_path.read_bytes())["episodes"][0]["processing_status"] == "failed"


def test_process_skips_complete_legacy_provenance_with_diagnostic(tmp_path, capsys):
    fixture = Path(__file__).parent / "fixtures" / "synthetic-episode.json"
    saved = json.loads(fixture.read_bytes())
    saved["podcast_id"] = "fixture-podcast"
    saved["episode_id"] = "episode-one"
    saved["source"] = {
        "kind": "rss",
        "key": "guid-one",
        "guid": "guid-one",
        "guid_aliases": [],
        "reference_url": "https://example.org/episode",
    }
    for name in ("configuration_revision", "transcript_revision"):
        saved["transcription"].pop(name, None)
    catalog_path = tmp_path / "catalog.json"
    output = tmp_path / "episodes"
    make_catalog(catalog_path, "https://audio.example/episode.wav")
    destination = output / "episode-one.json"
    destination.parent.mkdir()
    destination.write_text(json.dumps(saved), encoding="utf-8")

    assert run(catalog_path, output, tmp_path / "cache", "episode-one") == 0
    report = json.loads(capsys.readouterr().out)
    assert report["results"][0]["status"] == "skipped"
    assert report["results"][0]["legacy_provenance"] == "complete-without-revision-fields"


def test_process_reports_foreign_valid_transcript_as_conflict_without_replacing_it(
    tmp_path, capsys
):
    catalog_path = tmp_path / "catalog.json"
    output = tmp_path / "episodes"
    output.mkdir()
    make_catalog(catalog_path, "https://audio.example/episode.wav")
    fixture = Path(__file__).parent / "fixtures" / "synthetic-episode.json"
    valid_foreign = Episode.model_validate_json(fixture.read_bytes()).model_copy(
        update={"episode_id": "foreign-episode"}
    )
    destination = output / "episode-one.json"
    destination.write_text(valid_foreign.model_dump_json(indent=2) + "\n", encoding="utf-8")
    previous = destination.read_bytes()

    assert run(catalog_path, output, tmp_path / "cache", "episode-one") == 1
    report = json.loads(capsys.readouterr().out)["results"][0]
    assert report["status"] == "conflict"
    assert {"episode_id", "source.key"} <= set(report["identity_mismatches"])
    assert destination.read_bytes() == previous
    assert (
        json.loads(catalog_path.read_bytes())["episodes"][0]["processing_status"] == "not-processed"
    )


def test_process_accepts_catalog_verified_guid_alias_for_same_stable_source(tmp_path, capsys):
    catalog_path = tmp_path / "catalog.json"
    output = tmp_path / "episodes"
    output.mkdir()
    make_catalog(catalog_path, "https://audio.example/episode.wav")
    catalog_data = json.loads(catalog_path.read_bytes())
    catalog_data["episodes"][0]["source"]["guid"] = "verified-new-guid"
    catalog_data["episodes"][0]["source"]["guid_aliases"] = ["guid-one"]
    catalog_data["episodes"][0]["identity_verifications"] = [
        {
            "guid": "guid-one",
            "checked_at": "2026-10-17T00:00:00Z",
            "note": "Publisher source confirms the alias identifies this same recording.",
        }
    ]
    catalog_path.write_text(json.dumps(catalog_data), encoding="utf-8")

    fixture = Path(__file__).parent / "fixtures" / "synthetic-episode.json"
    transcript = Episode.model_validate_json(fixture.read_bytes()).model_copy(
        update={
            "podcast_id": "fixture-podcast",
            "episode_id": "episode-one",
            "source": Source(
                kind="rss",
                key="guid-one",
                guid="guid-one",
                reference_url="https://example.org/episode",
            ),
        }
    )
    destination = output / "episode-one.json"
    destination.write_text(transcript.model_dump_json(indent=2) + "\n", encoding="utf-8")

    assert run(catalog_path, output, tmp_path / "cache", "episode-one") == 0
    report = json.loads(capsys.readouterr().out)["results"][0]
    assert report["status"] == "skipped"
    assert "source" in report["metadata_mismatches"]
    assert "identity_mismatches" not in report
    assert json.loads(catalog_path.read_bytes())["episodes"][0]["processing_status"] == "completed"


def test_interruption_and_download_failure_remain_retryable(tmp_path, monkeypatch, capsys):
    catalog_path = tmp_path / "catalog.json"
    output = tmp_path / "episodes"
    cache = tmp_path / "cache"
    with audio_server(wave_bytes()) as (audio_url, _response):
        make_catalog(catalog_path, audio_url)
        install_external_recognizer(monkeypatch, tmp_path, interrupt=True)
        assert run(catalog_path, output, cache, "episode-one") == 130
        assert not (output / "episode-one.json").exists()
        assert json.loads(catalog_path.read_bytes())["episodes"][0]["processing_status"] == "failed"
        assert json.loads(capsys.readouterr().out)["results"][0]["status"] == "interrupted"
        assert not list((cache / "audio").iterdir())

        install_external_recognizer(monkeypatch, tmp_path)
        assert run(catalog_path, output, cache, "episode-one") == 0
        assert (output / "episode-one.json").exists()
        capsys.readouterr()

    failed_catalog = tmp_path / "failed-catalog.json"
    with audio_server(b"server unavailable", status=503) as (failing_url, _response):
        make_catalog(failed_catalog, failing_url)
        assert run(failed_catalog, tmp_path / "failed-episodes", cache, "episode-one") == 1
    failed = json.loads(capsys.readouterr().out)
    assert failed["results"][0]["status"] == "failed"
    assert "HTTP Error 503" in failed["results"][0]["error"]
    assert json.loads(failed_catalog.read_bytes())["episodes"][0]["processing_status"] == "failed"
    assert not list((cache / "audio").iterdir())


def test_process_groups_text_into_five_minute_segments_without_hiding_invalid_chunk_order(
    tmp_path, monkeypatch, capsys
):
    path, output, cache = tmp_path / "catalog.json", tmp_path / "episodes", tmp_path / "cache"
    results = [
        SimpleNamespace(start=10.0, end=15.0, text="Erster Satz."),
        SimpleNamespace(start=295.0, end=300.0, text="Nach langer Pause."),
        SimpleNamespace(start=310.0, end=315.0, text="Noch derselbe Abschnitt."),
        SimpleNamespace(start=320.0, end=330.0, text="Neuer Abschnitt."),
        SimpleNamespace(start=599.0, end=605.0, text="Ende."),
    ]
    install_external_recognizer(monkeypatch, tmp_path, results=results)
    with audio_server(wave_bytes(610)) as (url, _response):
        make_catalog(path, url)
        assert run(path, output, cache, "episode-one") == 0
        data = json.loads((output / "episode-one.json").read_bytes())
        assert data["segments"] == [
            {
                "id": "segment-000001",
                "start_seconds": 10,
                "end_seconds": 300,
                "text": "Erster Satz. Nach langer Pause.",
            },
            {
                "id": "segment-000002",
                "start_seconds": 310,
                "end_seconds": 605,
                "text": "Noch derselbe Abschnitt. Neuer Abschnitt. Ende.",
            },
        ]
        capsys.readouterr()
        previous = (output / "episode-one.json").read_bytes()
        results[1].start = 14.0
        assert run(path, output, cache, "episode-one", retranscribe=True) == 1
        assert "overlap" in json.loads(capsys.readouterr().out)["results"][0]["error"]
        assert (output / "episode-one.json").read_bytes() == previous
        assert not list((cache / "audio").iterdir())
