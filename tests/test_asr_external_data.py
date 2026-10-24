"""Exercise the production FP32 loader with tiny, real ONNX external weights offline."""

import shutil
import struct
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import onnxruntime as rt


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


def _load_and_run(directory):
    options = rt.SessionOptions()
    options.intra_op_num_threads = 1
    model = rt.InferenceSession(
        str(directory / "encoder-model.onnx"), options, providers=["CPUExecutionProvider"]
    )
    result = model.run(None, {"x": np.array([1], dtype=np.float32)})
    np.testing.assert_array_equal(result[0], [3])


def test_local_fp32_loader_materializes_external_weights_before_session_creation(
    tmp_path, monkeypatch
):
    import huggingface_hub
    import onnx_asr

    from podcast_words.transcribe import EXPORT_ID, VAD_ID, Transcriber

    snapshot = tmp_path / "snapshot"
    snapshot.mkdir()
    (snapshot / "encoder-model.onnx").write_bytes(_external_add_model("encoder-model.onnx.data"))
    (snapshot / "encoder-model.onnx.data").write_bytes(struct.pack("<f", 2))
    (snapshot / "config.json").write_text("{}", encoding="utf-8")
    (snapshot / "vocab.txt").write_text("fixture", encoding="utf-8")
    (snapshot / "decoder_joint-model.onnx").write_bytes(b"fixture decoder")

    def download(repo, **kwargs):
        if repo == VAD_ID:
            return str(snapshot)
        assert repo == EXPORT_ID
        local = Path(kwargs["local_dir"])
        shutil.copytree(snapshot, local)
        return str(local)

    class Model:
        asr = SimpleNamespace(
            _encoder=SimpleNamespace(
                get_providers=lambda: ["CUDAExecutionProvider", "CPUExecutionProvider"]
            ),
            _decoder_joint=SimpleNamespace(
                get_providers=lambda: ["CUDAExecutionProvider", "CPUExecutionProvider"]
            ),
        )

        def with_vad(self, *a, **k):
            return self

        def with_timestamps(self):
            return self

    def load(name, path, **kwargs):
        _load_and_run(Path(path))
        return Model()

    monkeypatch.setattr(huggingface_hub, "snapshot_download", download)
    monkeypatch.setattr(onnx_asr, "load_model", load)
    monkeypatch.setattr(
        onnx_asr,
        "load_vad",
        lambda *a, **k: SimpleNamespace(
            _model=SimpleNamespace(get_providers=lambda: ["CPUExecutionProvider"])
        ),
    )
    Transcriber(tmp_path / "cache")
