"""Reproduce ORT's external-data cache failure with a tiny model, without downloads."""

import os
import shutil
import struct
import subprocess
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import onnxruntime as rt
import pytest

from podcast_words import asr_diagnostics as diag


def _varint(value):
    out = bytearray()
    while value > 127:
        out.append((value & 127) | 128)
        value >>= 7
    return bytes(out) + bytes([value])


def _field(number, value):
    if isinstance(value, int):
        return _varint(number << 3) + _varint(value)
    if isinstance(value, str):
        value = value.encode()
    return _varint((number << 3) | 2) + _varint(len(value)) + value


def _external_add_model(location):
    # Minimal IR8/opset13 protobuf per onnx/onnx.proto: y = x + external float[1].
    # Keep the test independent of the large, optional ONNX exporter package.
    def value_info(name):
        shape = _field(1, _field(1, 1))
        tensor_type = _field(1, 1) + _field(2, shape)
        return _field(1, name) + _field(2, _field(1, tensor_type))

    external = _field(1, "location") + _field(2, location)
    tensor = _field(1, 1) + _field(2, 1) + _field(8, "weight")
    tensor += _field(13, external) + _field(14, 1)
    node = _field(1, "x") + _field(1, "weight") + _field(2, "y") + _field(4, "Add")
    graph = _field(1, node) + _field(2, "external-data-fixture") + _field(5, tensor)
    graph += _field(11, value_info("x")) + _field(12, value_info("y"))
    return _field(1, 8) + _field(7, graph) + _field(8, _field(2, 13))


@pytest.fixture
def sharded_snapshot(tmp_path):
    snapshot = tmp_path / "snapshots" / "revision"
    graph_blob = tmp_path / "blobs" / "9a"
    weights_blob = tmp_path / "blobs" / "79"
    for folder in (snapshot, graph_blob, weights_blob):
        folder.mkdir(parents=True)
    weight = weights_blob / "encoder-model.onnx.data"
    weight.write_bytes(struct.pack("<f", 2))
    junction = None
    if os.name == "nt":
        # Windows file symlinks require privileges; a directory junction exercises
        # the same canonical-path containment check without those privileges.
        location = "weights/encoder-model.onnx.data"
        junction = snapshot / "weights"
        result = subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(junction), str(weights_blob)],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode:
            pytest.fail(f"Cannot create fixture junction: {result.stderr}")
        (snapshot / "encoder-model.onnx").write_bytes(_external_add_model(location))
        shutil.copyfile(weight, snapshot / "encoder-model.onnx.data")
    else:
        location = "encoder-model.onnx.data"
        graph = graph_blob / "graph"
        graph.write_bytes(_external_add_model(location))
        (snapshot / "encoder-model.onnx").symlink_to(graph)
        (snapshot / "encoder-model.onnx.data").symlink_to(weight)
    (snapshot / "config.json").write_text("{}", encoding="utf-8")
    (snapshot / "vocab.txt").write_text("fixture", encoding="utf-8")
    (snapshot / "decoder_joint-model.onnx").write_bytes(b"unused fixture decoder")
    try:
        yield snapshot
    finally:
        if junction is not None:
            assert junction.parent == snapshot
            junction.rmdir()  # Remove only the link; the blob directory remains intact.


def _load_and_run(directory):
    options = rt.SessionOptions()
    options.intra_op_num_threads = 1
    model = rt.InferenceSession(
        str(directory / "encoder-model.onnx"), options, providers=["CPUExecutionProvider"]
    )
    result = model.run(None, {"x": np.array([1], dtype=np.float32)})
    np.testing.assert_array_equal(result[0], [3])


def test_real_ort_rejects_cache_links_and_accepts_identical_local_bytes(sharded_snapshot, tmp_path):
    with pytest.raises(Exception, match="External data path escapes model directory"):
        _load_and_run(sharded_snapshot)
    local = tmp_path / "plain-files"
    shutil.copytree(sharded_snapshot, local, symlinks=False)
    assert not (local / "encoder-model.onnx").is_symlink()
    assert (local / "encoder-model.onnx").read_bytes() == (
        sharded_snapshot / "encoder-model.onnx"
    ).read_bytes()
    _load_and_run(local)


def test_fp32_loader_materializes_files_before_real_ort_creation(
    sharded_snapshot, tmp_path, monkeypatch
):
    import huggingface_hub
    import onnx_asr

    def snapshot_download(repo, **kwargs):
        if repo == diag.VAD_ID:
            return str(sharded_snapshot)
        if kwargs.get("local_dir"):
            local = Path(kwargs["local_dir"])
            shutil.copytree(sharded_snapshot, local, symlinks=False)
            return str(local)
        return str(sharded_snapshot)

    class Session:
        def get_providers(self):
            return [diag.CUDA, diag.CPU]

    class Model:
        asr = SimpleNamespace(
            _encoder=Session(), _decoder_joint=Session(), _preprocessor=SimpleNamespace()
        )
        resampler = SimpleNamespace(_preprocessors={})

        def with_vad(self, *args, **kwargs):
            return self

        def with_timestamps(self):
            return self

    def load_model(name, path, **kwargs):
        _load_and_run(Path(path))
        return Model()

    monkeypatch.setattr(huggingface_hub, "snapshot_download", snapshot_download)
    monkeypatch.setattr(onnx_asr, "load_model", load_model)
    monkeypatch.setattr(onnx_asr, "load_vad", lambda *a, **k: SimpleNamespace(_model=Session()))
    monkeypatch.setattr(rt, "get_available_providers", lambda: [diag.CUDA, diag.CPU])
    monkeypatch.setattr(rt, "preload_dlls", lambda: None)
    diag.load_models(diag.CASES["cuda-fp32"], tmp_path / "experiment", False)
