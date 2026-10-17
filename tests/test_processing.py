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
    session = SimpleNamespace(get_providers=lambda: ["CPUExecutionProvider"])
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
        asr=SimpleNamespace(_encoder=session, _decoder_joint=session),
        with_vad=lambda *_args, **_kwargs: SimpleNamespace(
            with_timestamps=lambda: SimpleNamespace(recognize=recognize)
        ),
    )
    monkeypatch.setattr(onnx_asr, "load_model", lambda *_args, **_kwargs: recognizer)
    monkeypatch.setattr(
        onnx_asr, "load_vad", lambda *_args, **_kwargs: SimpleNamespace(_model=session)
    )
    monkeypatch.setattr(
        huggingface_hub, "snapshot_download", lambda *_args, **_kwargs: str(tmp_path)
    )


def run(catalog, output, cache, *episode_ids, retranscribe=False):
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
