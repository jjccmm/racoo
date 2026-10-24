"""Controlled external recognizer and local HTTP audio for public CLI tests."""

import threading
import wave
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace

import huggingface_hub
import onnx_asr


@contextmanager
def audio_server(body, status=200):
    response = {"body": body, "status": status, "requests": 0}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            response["requests"] += 1
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


def install_external_recognizer(monkeypatch, tmp_path, *, interrupt=False, results=None):
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
    )

    def recognize(*_args, **_kwargs):
        if interrupt:
            raise KeyboardInterrupt
        return iter(results if results is not None else [result])

    recognizer = SimpleNamespace(
        asr=SimpleNamespace(_encoder=encoder, _decoder_joint=decoder),
        with_vad=lambda *_args, **_kwargs: SimpleNamespace(recognize=recognize),
    )
    monkeypatch.setattr(onnx_asr, "load_model", lambda *_args, **_kwargs: recognizer)
    monkeypatch.setattr(
        onnx_asr, "load_vad", lambda *_args, **_kwargs: SimpleNamespace(_model=vad_session)
    )
    monkeypatch.setattr(
        huggingface_hub, "snapshot_download", lambda *_args, **_kwargs: str(tmp_path)
    )
