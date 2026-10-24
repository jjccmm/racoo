"""Selected processing is exercised through the public CLI and external boundaries."""

import hashlib
import json
import threading
import wave
from contextlib import contextmanager
from datetime import UTC, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace

import huggingface_hub
import onnx_asr

from podcast_words import transcribe
from podcast_words.catalog import Catalog, CatalogEpisode, Enclosure, Source
from podcast_words.cli import main
from podcast_words.contracts import Episode


@contextmanager
def audio_server(body, status=200):
    response = {"body": body, "status": status}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(response["status"])
            self.send_header("Content-Type", "audio/wav")
            self.end_headers()
            self.wfile.write(response["body"])

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/audio.wav", response
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def wave_bytes(duration=5):
    from io import BytesIO

    output = BytesIO()
    with wave.open(output, "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(16000)
        stream.writeframes(b"\0\0" * 16000 * duration)
    return output.getvalue()


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


def install_external_recognizer(monkeypatch, tmp_path, *, interrupt=False):
    encoder = SimpleNamespace(
        get_providers=lambda: ["CUDAExecutionProvider", "CPUExecutionProvider"]
    )
    decoder = SimpleNamespace(
        get_providers=lambda: ["CUDAExecutionProvider", "CPUExecutionProvider"]
    )
    vad_session = SimpleNamespace(get_providers=lambda: ["CPUExecutionProvider"])
    result = SimpleNamespace(
        start=1.0,
        end=3.0,
        text="Known words.",
        tokens=["Known", "words"],
        timestamps=[0.1, 1.0],
    )

    def recognize(*_args, **_kwargs):
        if interrupt:
            raise KeyboardInterrupt
        return iter([result])

    recognizer = SimpleNamespace(
        asr=SimpleNamespace(_encoder=encoder, _decoder_joint=decoder),
        with_vad=lambda *_args, **_kwargs: SimpleNamespace(
            with_timestamps=lambda: SimpleNamespace(recognize=recognize)
        ),
    )
    monkeypatch.setattr(onnx_asr, "load_model", lambda *_args, **_kwargs: recognizer)
    monkeypatch.setattr(
        onnx_asr, "load_vad", lambda *_args, **_kwargs: SimpleNamespace(_model=vad_session)
    )
    monkeypatch.setattr(
        huggingface_hub, "snapshot_download", lambda *_args, **_kwargs: str(tmp_path)
    )


def run(
    catalog,
    output,
    cache,
    *episode_ids,
    retranscribe=False,
    run_report=None,
    audio_file=None,
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
    if audio_file:
        args.extend(["--audio-file", str(audio_file)])
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
        assert first["audio"]["sha256"] == hashlib.sha256(audio).hexdigest()
        assert first["transcription"]["input_revision"]
        assert first["transcription"]["configuration_revision"]
        assert first["transcription"]["transcript_revision"]
        assert (
            json.loads(catalog_path.read_bytes())["episodes"][0]["processing_status"] == "completed"
        )
        initial_output = capsys.readouterr().out

        assert run(catalog_path, output, cache, "episode-one") == 0
        resumed = json.loads(capsys.readouterr().out)
        assert resumed["results"][0]["status"] == "skipped"
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
        assert json.loads(capsys.readouterr().out)["results"][0]["status"] == "completed"
        assert json.loads(initial_output)["results"][0]["status"] == "completed"


def test_process_rejects_one_audio_file_for_multiple_episode_identities(
    tmp_path, monkeypatch, capsys
):
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(wave_bytes())
    catalog_path = tmp_path / "catalog.json"
    output = tmp_path / "episodes"
    with audio_server(wave_bytes()) as (audio_url, _response):
        make_catalog(catalog_path, audio_url)
        original_catalog = catalog_path.read_bytes()
        recognizer_started = False

        def should_not_initialize(*_args, **_kwargs):
            nonlocal recognizer_started
            recognizer_started = True
            raise AssertionError("preflight must reject before ASR setup")

        monkeypatch.setattr(onnx_asr, "load_model", should_not_initialize)
        assert (
            run(
                catalog_path,
                output,
                tmp_path / "cache",
                "episode-one",
                "episode-two",
                audio_file=audio_path,
            )
            == 1
        )
    assert json.loads(capsys.readouterr().out)["ok"] is False
    assert not recognizer_started
    assert not output.exists()
    assert catalog_path.read_bytes() == original_catalog


def test_process_run_report_cannot_alias_catalog_before_any_processing(
    tmp_path, monkeypatch, capsys
):
    catalog_path = tmp_path / "catalog.json"
    output = tmp_path / "episodes"
    audio_path = tmp_path / "audio.wav"
    audio_path.write_bytes(wave_bytes())
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
                audio_file=audio_path,
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
        "stale-input": {
            "input_revision": "0" * 64,
            "configuration_revision": "1" * 64,
            "transcript_revision": "2" * 64,
        },
        "stale-transcript": {
            "input_revision": original["audio"]["sha256"],
            "configuration_revision": "1" * 64,
            "transcript_revision": "2" * 64,
        },
        "partial": {
            "input_revision": original["audio"]["sha256"],
            "configuration_revision": None,
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
    for name in ("input_revision", "configuration_revision", "transcript_revision"):
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


def test_changed_download_of_same_url_retains_both_exact_audio_versions(
    tmp_path, monkeypatch, capsys
):
    first, second = wave_bytes(5), wave_bytes(6)
    path, output, cache = tmp_path / "catalog.json", tmp_path / "episodes", tmp_path / "cache"
    install_external_recognizer(monkeypatch, tmp_path)
    with audio_server(first) as (url, response):
        make_catalog(path, url)
        assert run(path, output, cache, "episode-one") == 0
        report1 = json.loads(capsys.readouterr().out)
        response["body"] = second
        assert run(path, output, cache, "episode-one", retranscribe=True) == 0
        report2 = json.loads(capsys.readouterr().out)
    for raw, report in ((first, report1), (second, report2)):
        data = report["runtime_measurements"]["episodes"][0]["episode"]["input"]
        reference = Path(data["reference_audio_file"])
        assert reference.read_bytes() == raw
        assert data["audio_sha256"] == hashlib.sha256(raw).hexdigest()
        assert data["source_url_is_fixed_audio_version"] is False
    assert len(list((cache / "audio").glob("*.wav"))) == 2
