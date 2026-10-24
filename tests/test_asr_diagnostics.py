"""Exercise the diagnostic workflow with real PCM audio and external model doubles."""

import contextlib
import json
import subprocess
import sys
import time
import wave
import zipfile
from dataclasses import asdict
from pathlib import Path
from types import SimpleNamespace

import imageio_ffmpeg
import pytest

from podcast_words import asr_diagnostics as diag


@pytest.fixture
def experiment(tmp_path, monkeypatch):
    source = tmp_path / "source.wav"
    with wave.open(str(source), "wb") as out:
        out.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
        out.writeframes(b"\x01\x00" * 48000)
    monkeypatch.setattr(diag.shutil, "which", lambda _: imageio_ffmpeg.get_ffmpeg_exe())
    work = tmp_path / "experiment"
    diag.prepare(work, audio_file=source, start=0.5, duration=2, profile_duration=1)
    return work


def fake_models(monkeypatch, *, after_recognize=None, profile=False):
    calls = []

    def recognize(path):
        calls.append(Path(path))
        # A lazy generator: not consuming it would measure virtually no inference.
        yield SimpleNamespace(
            start=0.1, end=0.9, text="Ein Eimer", tokens=["Ein", "Eimer"], timestamps=[0.1, 0.4]
        )
        if after_recognize:
            after_recognize()

    def load(case, work, enabled):
        return (
            SimpleNamespace(recognize=recognize),
            {},
            {
                "downloads_seconds": 0,
                "sessions_seconds": 0,
                "session_providers": {},
                "preprocessor_class": "fixture",
            },
        )

    monkeypatch.setattr(diag, "load_models", load)
    monkeypatch.setattr(diag, "runtime_facts", lambda: {"fixture": True})
    if profile:
        monkeypatch.setattr(
            diag,
            "finish_profiles",
            lambda sessions: {
                "sessions": {},
                "cuda_model_nodes": 2,
                "cuda_execution_confirmed": True,
                "event_limit_reached": False,
            },
        )
    return calls


def test_prepare_freezes_source_and_preserves_exact_pcm_prefix(experiment):
    manifest = diag.read_manifest(experiment)
    assert manifest["source"]["sha256"] == diag.file_sha256(experiment / "source.audio")
    with (
        wave.open(str(experiment / "excerpt.wav"), "rb") as full,
        wave.open(str(experiment / "profile.wav"), "rb") as short,
    ):
        assert full.getnframes() == 32000
        assert short.getnframes() == 16000
        assert full.readframes(16000) == short.readframes(16000)
    with pytest.raises(FileExistsError):
        diag.prepare(experiment, audio_file=experiment / "source.audio")


@pytest.mark.parametrize("start,duration", [(float("nan"), 2), (0, float("inf")), (-1, 2), (0, 0)])
def test_invalid_windows_fail_before_download(tmp_path, start, duration):
    with pytest.raises(ValueError):
        diag.prepare(
            tmp_path / "invalid",
            audio_url="https://example.org/audio",
            start=start,
            duration=duration,
        )


def test_each_optional_experiment_changes_only_its_documented_variable():
    for baseline, candidate, field in diag.CONTROLLED_PAIRS:
        left, right = asdict(diag.CASES[baseline]), asdict(diag.CASES[candidate])
        assert {key for key in left if left[key] != right[key]} == {field}


def test_warmup_and_all_repeats_execute_lazy_recognizer_and_validate_times(experiment, monkeypatch):
    calls = fake_models(monkeypatch)
    report = diag.run_case(experiment, "cuda-int8", repeats=3)
    assert len(calls) == 4
    assert report["status"] == "completed"
    assert report["statistics"]["n"] == 3
    assert report["warmup"]["included_in_statistics"] is False
    assert report["sample_output"]["segments"][0]["token_points"][0]["at_seconds"] == 0.2
    assert all(
        item["text_sha256"] == report["samples"][0]["text_sha256"] for item in report["samples"]
    )
    assert report["execution_proof"] == "unavailable-profile-disabled"


def test_changed_excerpt_stops_run_and_preserves_failure_report(experiment, monkeypatch):
    changed = experiment / "excerpt.wav"
    calls = fake_models(monkeypatch, after_recognize=lambda: changed.write_bytes(b"modified"))
    with pytest.raises(ValueError, match="Audio changed"):
        diag.run_case(experiment, "cuda-int8")
    saved = json.loads((experiment / "reports/cuda-int8.json").read_bytes())
    assert len(calls) == 1
    assert saved["status"] == "error"
    assert saved["samples"] == []


def test_profile_is_one_short_run_and_never_counted_as_warm_timing(experiment, monkeypatch):
    calls = fake_models(monkeypatch, profile=True)
    report = diag.run_case(experiment, "cuda-fp32", profile=True)
    assert calls == [experiment / "profile.wav"]
    assert report["warmup"] is None
    assert report["statistics"] is None
    assert report["audio"]["duration_seconds"] == 1
    assert report["profile"]["cuda_execution_confirmed"]


def test_summary_rejects_foreign_or_changed_evidence(experiment, monkeypatch):
    fake_models(monkeypatch)
    diag.run_case(experiment, "cuda-int8")
    diag.run_case(experiment, "cuda-fp32")
    report = diag.summarize(experiment)
    assert report["controlled_comparisons"][0]["changed_setting"] == "precision"
    assert report["controlled_comparisons"][0]["text_similarity_is_accuracy"] is False
    path = experiment / "reports/cuda-fp32.json"
    other = json.loads(path.read_bytes())
    other["manifest_sha256"] = "0" * 64
    path.write_text(json.dumps(other), encoding="utf-8")
    with pytest.raises(ValueError, match="different experiment"):
        diag.summarize(experiment)


def test_missing_cuda_is_rejected_instead_of_silently_benchmarking_cpu(experiment, monkeypatch):
    monkeypatch.setitem(
        sys.modules, "onnxruntime", SimpleNamespace(get_available_providers=lambda: [diag.CPU])
    )
    monkeypatch.setitem(sys.modules, "onnx_asr", SimpleNamespace())
    with pytest.raises(RuntimeError, match="CUDAExecutionProvider"):
        diag.load_models(diag.CASES["cuda-int8"], experiment, False)


def test_fp32_download_includes_external_weights_and_uses_none_quantization(
    experiment, monkeypatch
):
    import huggingface_hub
    import onnx_asr
    import onnxruntime

    downloads, settings = [], []

    class Session:
        def get_providers(self):
            return [diag.CUDA, diag.CPU]

    class Model:
        asr = SimpleNamespace(
            _encoder=Session(), _decoder_joint=Session(), _preprocessor=SimpleNamespace()
        )
        resampler = SimpleNamespace(_preprocessors={})

        def with_vad(self, vad, **kwargs):
            settings.append(kwargs)
            return self

        def with_timestamps(self):
            return self

    def snapshot(repo, **kwargs):
        downloads.append((repo, kwargs))
        return str(experiment)

    def model(*args, **kwargs):
        settings.append(kwargs)
        return Model()

    monkeypatch.setattr(onnxruntime, "get_available_providers", lambda: [diag.CUDA, diag.CPU])
    monkeypatch.setattr(onnxruntime, "preload_dlls", lambda: None)
    monkeypatch.setattr(huggingface_hub, "snapshot_download", snapshot)
    monkeypatch.setattr(onnx_asr, "load_model", model)
    monkeypatch.setattr(onnx_asr, "load_vad", lambda *a, **k: SimpleNamespace(_model=Session()))
    diag.load_models(diag.CASES["cuda-fp32"], experiment, False)
    assert "encoder-model.onnx.data" in downloads[0][1]["allow_patterns"]
    assert downloads[0][1]["revision"] == diag.EXPORT_REVISION
    assert settings[0]["quantization"] is None
    assert settings[1]["batch_size"] == 1


def test_profile_limit_and_cpu_integer_operators_remain_visible(tmp_path):
    path = tmp_path / "encoder.json"
    path.write_text("[]", encoding="utf-8")
    session = SimpleNamespace(end_profiling=lambda: str(path))
    summary = diag.finish_profiles({"encoder": session})
    assert summary["cuda_execution_confirmed"] is False
    assert summary["sessions"]["encoder"]["event_count"] == 0
    assert summary["sessions"]["encoder"]["kernel_events"]["duration_microseconds_sum"] is None


def test_actual_notebook_runs_remaining_cases_and_exports_timeout_evidence(
    experiment, monkeypatch, tmp_path
):
    fake_models(monkeypatch, profile=True)
    notebook = json.loads(
        (Path(__file__).resolve().parents[1] / "notebooks/colab_diagnostics.ipynb").read_bytes()
    )
    display_module = SimpleNamespace(
        Audio=lambda **kwargs: None, Markdown=str, display=lambda *args: None
    )
    monkeypatch.setitem(sys.modules, "IPython", SimpleNamespace(display=display_module))
    monkeypatch.setitem(sys.modules, "IPython.display", display_module)
    # The preparation cell requires a fresh directory; reuse the fixture's original source.
    source = experiment / "source.audio"
    new_work = tmp_path / "notebook-experiment"
    logs = tmp_path / "logs"
    logs.mkdir()

    def execute(command, *, stdout, **kwargs):
        args = command[3:]
        if args[0] == "run" and "cuda-fp32" in args and "--profile" not in args:
            raise subprocess.TimeoutExpired(command, 1200)
        with contextlib.redirect_stdout(stdout):
            code = diag.main(args)
        return subprocess.CompletedProcess(command, code)

    namespace = {
        "json": json,
        "Path": Path,
        "subprocess": SimpleNamespace(
            run=execute, STDOUT=subprocess.STDOUT, TimeoutExpired=subprocess.TimeoutExpired
        ),
        "time": time,
        "zipfile": zipfile,
        "source_audio_file": str(source),
        "context": {"external_failures": []},
        "command_prefix": ["fixture-python", "-m", "podcast_words.asr_diagnostics"],
        "project": tmp_path,
        "work_dir": new_work,
        "log_dir": logs,
        "save_to_drive": False,
        "excerpt_start_seconds": 0,
        "excerpt_duration_seconds": 2,
        "profile_duration_seconds": 1,
        "repeats": 3,
        "timing_cases": ["cuda-int8", "cuda-fp32", "cpu-int8"],
        "profile_cases": ["cuda-int8"],
        "extra_cases": [],
    }
    sources = ["".join(c["source"]) for c in notebook["cells"] if c["cell_type"] == "code"]
    for source_text in sources[2:]:
        exec(compile(source_text, "actual-diagnostic-notebook", "exec"), namespace)
    report = json.loads((new_work / "diagnostic-report.json").read_bytes())
    assert len(report["notebook_context"]["external_failures"]) == 1
    assert report["notebook_context"]["external_failures"][0]["error"] == "timeout"
    assert {r["case_name"] for r in report["reports"] if r["status"] == "completed"} == {
        "cuda-int8",
        "cpu-int8",
    }
    with zipfile.ZipFile(new_work / "diagnostic-results.zip") as archive:
        assert "diagnostic-report.json" in archive.namelist()
        assert "logs/cuda-fp32.log" in archive.namelist()
        assert not any(name.endswith(".wav") for name in archive.namelist())
