"""Processing-command seam; only the external hub and recognizer are fixtures."""

import hashlib
import json
import wave
from pathlib import Path
from types import SimpleNamespace

import huggingface_hub
import onnx_asr
from onnxruntime.capi.onnxruntime_pybind11_state import InvalidGraph

from podcast_words.cli import main
from podcast_words.contracts import Episode


def test_transcribe_preserves_identity_original_audio_and_times_after_a_pause(
    tmp_path, monkeypatch, capsys
):
    audio = tmp_path / "source.wav"
    with wave.open(str(audio), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(16000)
        output.writeframes(b"\0\0" * 16000 * 90)
    metadata = tmp_path / "metadata.json"
    original = {
        "podcast_id": "synthetic-podcast",
        "episode_id": "assigned-identity-42",
        "source": {
            "kind": "synthetic",
            "key": "fixed-source",
            "reference_url": "https://example.org/episode",
        },
        "title": "Known external recognition fixture",
        "published_at": "2026-10-16T12:00:00Z",
        "audio_url": "https://example.org/original.wav",
    }
    metadata.write_text(json.dumps(original), encoding="utf-8")
    session = SimpleNamespace(get_providers=lambda: ["CPUExecutionProvider"])
    results = [
        SimpleNamespace(
            start=10.0, end=15.0, text="Ein Eimer.", tokens=["Ein", "Eimer"], timestamps=[0.08, 2.4]
        ),
        SimpleNamespace(
            start=60.0,
            end=65.0,
            text="Münzen nach der Pause.",
            tokens=[" ", "Münzen"],
            timestamps=[0.0, 4.0],
        ),
    ]
    recognizer = SimpleNamespace(
        asr=SimpleNamespace(_encoder=session, _decoder_joint=session),
        with_vad=lambda *args, **kwargs: SimpleNamespace(
            with_timestamps=lambda: SimpleNamespace(recognize=lambda *args, **kwargs: iter(results))
        ),
    )
    monkeypatch.setattr(onnx_asr, "load_model", lambda *args, **kwargs: recognizer)
    monkeypatch.setattr(
        onnx_asr, "load_vad", lambda *args, **kwargs: SimpleNamespace(_model=session)
    )
    monkeypatch.setattr(huggingface_hub, "snapshot_download", lambda *args, **kwargs: str(tmp_path))
    destination = tmp_path / "episode.json"
    run_report = tmp_path / "benchmark" / "run.json"

    assert (
        main(
            [
                "transcribe",
                "--metadata",
                str(metadata),
                "--audio-file",
                str(audio),
                "--output",
                str(destination),
                "--cache-dir",
                str(tmp_path / "cache"),
                "--run-report",
                str(run_report),
            ]
        )
        == 0
    )
    report = json.loads(capsys.readouterr().out)
    episode = Episode.model_validate_json(destination.read_bytes())
    assert episode.episode_id == "assigned-identity-42"
    assert episode.audio.sha256 == hashlib.sha256(audio.read_bytes()).hexdigest()
    assert episode.audio.duration_seconds == 90
    assert [point.at_seconds for point in episode.segments[1].token_points] == [60, 64]
    assert episode.segments[1].token_points[0].text == " "
    assert episode.segments[0].token_points[0].at_seconds == 10.08
    assert episode.segments[1].text == "Münzen nach der Pause."
    assert len({segment.id for segment in episode.segments}) == 2
    assert episode.transcription.execution_providers["encoder"] == ["CPUExecutionProvider"]
    assert report["ok"] is True
    measurements = report["runtime_measurements"]
    assert measurements["episode"]["audio_download"]["status"] == "provided-local-file"
    assert measurements["episode"]["decode"]["elapsed_seconds"] >= 0
    assert measurements["episode"]["inference"]["elapsed_seconds"] >= 0
    assert measurements["episode"]["validation_and_serialization"]["elapsed_seconds"] >= 0
    assert measurements["model"]["encoder_decoder_session_initialization"]["elapsed_seconds"] >= 0
    assert measurements["model"]["vad_session_initialization"]["elapsed_seconds"] >= 0
    assert run_report.is_file()
    assert json.loads(run_report.read_bytes()) == measurements
    assert main(["validate", str(destination)]) == 0


def test_transcribe_rejects_unpaired_native_token_points_without_saving(
    tmp_path, monkeypatch, capsys
):
    fixture = json.loads((Path(__file__).parent / "fixtures/synthetic-episode.json").read_bytes())
    metadata = tmp_path / "metadata.json"
    keys = ["podcast_id", "episode_id", "source", "title", "published_at"]
    metadata.write_text(
        json.dumps(
            {key: fixture[key] for key in keys}
            | {
                "audio_url": fixture["audio"]["url"],
            }
        ),
        encoding="utf-8",
    )
    audio = tmp_path / "audio.wav"
    with wave.open(str(audio), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(16000)
        output.writeframes(b"\0\0" * 16000 * 5)
    session = SimpleNamespace(get_providers=lambda: ["CPUExecutionProvider"])
    result = SimpleNamespace(
        start=0.0, end=4.0, text="Native token without point.", tokens=["Native"], timestamps=None
    )
    recognizer = SimpleNamespace(
        asr=SimpleNamespace(_encoder=session, _decoder_joint=session),
        with_vad=lambda *args, **kwargs: SimpleNamespace(
            with_timestamps=lambda: SimpleNamespace(
                recognize=lambda *args, **kwargs: iter([result])
            )
        ),
    )
    monkeypatch.setattr(onnx_asr, "load_model", lambda *args, **kwargs: recognizer)
    monkeypatch.setattr(
        onnx_asr, "load_vad", lambda *args, **kwargs: SimpleNamespace(_model=session)
    )
    monkeypatch.setattr(huggingface_hub, "snapshot_download", lambda *args, **kwargs: str(tmp_path))
    destination = tmp_path / "episode.json"
    assert (
        main(
            [
                "transcribe",
                "--metadata",
                str(metadata),
                "--audio-file",
                str(audio),
                "--output",
                str(destination),
                "--cache-dir",
                str(tmp_path / "cache"),
            ]
        )
        == 1
    )
    assert not destination.exists()
    assert "token" in json.loads(capsys.readouterr().out)["error"]


def test_transcribe_reports_runtime_model_failure_as_diagnostics(tmp_path, monkeypatch, capsys):
    metadata = tmp_path / "metadata.json"
    metadata.write_text(
        json.dumps(
            {
                "podcast_id": "fixture",
                "episode_id": "fixture",
                "source": {
                    "kind": "synthetic",
                    "key": "fixture",
                    "reference_url": "https://example.org",
                },
                "title": "Fixture",
                "published_at": "2026-10-16T12:00:00Z",
                "audio_url": "https://example.org/audio.mp3",
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(huggingface_hub, "snapshot_download", lambda *args, **kwargs: str(tmp_path))

    def unavailable(*args, **kwargs):
        raise InvalidGraph("external runtime rejected model")

    monkeypatch.setattr(onnx_asr, "load_model", unavailable)
    destination = tmp_path / "episode.json"
    assert (
        main(
            [
                "transcribe",
                "--metadata",
                str(metadata),
                "--output",
                str(destination),
                "--cache-dir",
                str(tmp_path / "cache"),
            ]
        )
        == 1
    )
    assert not destination.exists()
    assert json.loads(capsys.readouterr().out)["error"] == "external runtime rejected model"
