"""Routine tests replace the GPU/model boundary, while real FFmpeg and contracts run."""

import onnxruntime
import pytest

from podcast_words import transcribe


@pytest.fixture(autouse=True)
def isolated_asr_boundary(request, monkeypatch):
    if request.module.__name__.split(".")[-1] in {
        "test_processing",
        "test_transcribe",
        "test_asr_external_data",
    }:
        monkeypatch.setattr(transcribe, "prepare_runtime", lambda _cache: None)
        monkeypatch.setattr(
            onnxruntime,
            "get_available_providers",
            lambda: ["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
