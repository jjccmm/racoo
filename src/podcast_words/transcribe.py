"""Identified audio to validated episode; Windows CPU and Colab share this adapter."""

import hashlib
import json
import platform
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import wave
from datetime import UTC, datetime
from importlib.metadata import version
from pathlib import Path
from typing import Annotated

from pydantic import AwareDatetime, Field, HttpUrl

from podcast_words.contracts import Contract, Episode, Identifier, Source, Text

MODEL_ID = "nvidia/parakeet-tdt-0.6b-v3"
MODEL_REVISION = "541d1f99c6b0c3cd0b11a95167540bb8edefd82b"
EXPORT_ID = "istupakov/parakeet-tdt-0.6b-v3-onnx"
EXPORT_REVISION = "8f23f0c03c8761650bdb5b40aaf3e40d2c15f1ce"
VAD_ID = "istupakov/silero-vad-onnx"
VAD_REVISION = "b3e3ee3cce4c11ceb63b1a0b229d916069c1ddf6"
VAD_OPTIONS = {
    "batch_size": 1,
    "max_speech_duration_s": 20,
    "min_speech_duration_ms": 250,
    "min_silence_duration_ms": 100,
    "speech_pad_ms": 0,
    "threshold": 0.5,
}


class EpisodeInput(Contract):
    """Identity is already assigned by the catalog or an explicit operator decision."""

    podcast_id: Identifier
    episode_id: Identifier
    source: Source
    title: Text
    published_at: AwareDatetime
    episode_number: Annotated[int, Field(gt=0)] | None = None
    webpage_url: HttpUrl | None = None
    audio_url: HttpUrl


def download_audio(url: str, destination: Path, *, timeout: float = 30, attempts: int = 3):
    """Bound per-read time, total attempt duration and retries; never reuse a partial file."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(".partial")
    for attempt in range(attempts):
        try:
            deadline = time.monotonic() + 600
            request = urllib.request.Request(url, headers={"User-Agent": "podcast-words/0.1"})
            with (
                urllib.request.urlopen(request, timeout=timeout) as response,
                partial.open("wb") as out,
            ):
                while chunk := response.read(1024 * 1024):
                    if time.monotonic() > deadline:
                        raise TimeoutError("audio download exceeded 600 seconds")
                    out.write(chunk)
            partial.replace(destination)
            return
        except (OSError, urllib.error.URLError):
            partial.unlink(missing_ok=True)
            if attempt == attempts - 1:
                raise


class Transcriber:
    """One loaded model per run; callers may process several identified episodes."""

    def __init__(self, cache_dir: Path):
        import onnx_asr
        import onnxruntime
        from huggingface_hub import snapshot_download

        self.cache_dir = cache_dir
        model_path = snapshot_download(
            EXPORT_ID,
            revision=EXPORT_REVISION,
            cache_dir=str(cache_dir / "models"),
            allow_patterns=[
                "config.json",
                "vocab.txt",
                "encoder-model.int8.onnx",
                "decoder_joint-model.int8.onnx",
            ],
        )
        vad_path = snapshot_download(
            VAD_ID,
            revision=VAD_REVISION,
            cache_dir=str(cache_dir / "models"),
            allow_patterns=["config.json", "silero_vad.onnx"],
        )
        options = onnxruntime.SessionOptions()
        options.intra_op_num_threads = 4
        model = onnx_asr.load_model(
            "nemo-parakeet-tdt-0.6b-v3",
            model_path,
            quantization="int8",
            providers=["CPUExecutionProvider"],
            sess_options=options,
        )
        vad = onnx_asr.load_vad(
            "silero",
            vad_path,
            providers=["CPUExecutionProvider"],
            sess_options=options,
        )
        # onnx-asr 0.12.0 has no public provider-report API. Read the actual sessions,
        # rather than recording get_available_providers() or requested configuration.
        self.execution_providers = {
            "encoder": model.asr._encoder.get_providers(),
            "decoder_joint": model.asr._decoder_joint.get_providers(),
            "vad": vad._model.get_providers(),
        }
        if any(value != ["CPUExecutionProvider"] for value in self.execution_providers.values()):
            raise RuntimeError("CPU run did not obtain CPU-only inference sessions")
        self.model = model.with_vad(vad, **VAD_OPTIONS).with_timestamps()

    def transcribe(self, metadata: EpisodeInput, audio_file: Path | None = None) -> Episode:
        """Decode the exact input, recognize speech and validate absolute episode times."""
        audio_dir = self.cache_dir / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)
        if audio_file is None:
            key = hashlib.sha256(str(metadata.audio_url).encode()).hexdigest()
            audio_file = audio_dir / f"{key}.source"
            download_audio(str(metadata.audio_url), audio_file)
        with audio_file.open("rb") as original:
            checksum = hashlib.file_digest(original, "sha256").hexdigest()
        with tempfile.TemporaryDirectory(dir=audio_dir) as temporary:
            wav = Path(temporary) / "decoded.wav"
            subprocess.run(
                [
                    "ffmpeg",
                    "-nostdin",
                    "-v",
                    "error",
                    "-i",
                    str(audio_file),
                    "-vn",
                    "-ac",
                    "1",
                    "-ar",
                    "16000",
                    "-c:a",
                    "pcm_s16le",
                    str(wav),
                ],
                capture_output=True,
                text=True,
                check=True,
                timeout=900,
            )
            with wave.open(str(wav), "rb") as decoded:
                duration = decoded.getnframes() / decoded.getframerate()
            segments = []
            for result in self.model.recognize(wav):
                if not result.text.strip():
                    continue
                points = []
                if (result.tokens is None) != (result.timestamps is None):
                    raise ValueError("native token text and timestamps must be supplied together")
                if result.tokens is not None and result.timestamps is not None:
                    points = [
                        {"text": token, "at_seconds": result.start + point}
                        for token, point in zip(result.tokens, result.timestamps, strict=True)
                    ]
                segments.append(
                    {
                        "id": f"segment-{len(segments) + 1:06d}",
                        "text": result.text,
                        "start_seconds": result.start,
                        "end_seconds": result.end,
                        "token_points": points,
                    }
                )
        if not segments:
            raise ValueError("recognizer returned no spoken text; no completed transcript saved")
        data = metadata.model_dump(mode="json", exclude={"audio_url"}) | {
            "schema_version": 1,
            "audio": {
                "url": str(metadata.audio_url),
                "sha256": checksum,
                "duration_seconds": duration,
            },
            "transcription": {
                "model_id": MODEL_ID,
                "model_revision": MODEL_REVISION,
                "export_id": EXPORT_ID,
                "export_revision": EXPORT_REVISION,
                "processed_at": datetime.now(UTC).isoformat(),
                "runtime_versions": {
                    "python": platform.python_version(),
                    **{
                        name: version(name)
                        for name in [
                            "onnx-asr",
                            "onnxruntime",
                            "numpy",
                            "huggingface-hub",
                            "podcast-words",
                        ]
                    },
                },
                "execution_providers": self.execution_providers,
                "configuration": {
                    "quantization": "int8",
                    "upstream_revision_role": "selected metadata revision; export linkage unattested",
                    "vad_id": VAD_ID,
                    "vad_revision": VAD_REVISION,
                    "vad_options": json.dumps(VAD_OPTIONS, sort_keys=True),
                    "audio_decode": "ffmpeg mono PCM s16le 16000 Hz; original full timeline",
                    "token_times": "segment-relative seconds + VAD start, once",
                    "intra_op_num_threads": "4",
                },
            },
            "segments": segments,
        }
        return Episode.model_validate_json(json.dumps(data))


def transcribe_command(
    metadata_path: Path, output: Path, cache_dir: Path, audio_file: Path | None = None
) -> int:
    started = time.monotonic()
    try:
        if output.exists():
            raise FileExistsError(f"output already exists; choose another destination: {output}")
        metadata = EpisodeInput.model_validate_json(metadata_path.read_bytes())
        episode = Transcriber(cache_dir).transcribe(metadata, audio_file)
        output.parent.mkdir(parents=True, exist_ok=True)
        content = episode.model_dump_json(indent=2) + "\n"
        with output.open("x", encoding="utf-8", newline="\n") as destination:
            destination.write(content)
        print(
            json.dumps(
                {
                    "ok": True,
                    "episode_id": episode.episode_id,
                    "output": str(output),
                    "elapsed_seconds": round(time.monotonic() - started, 3),
                    "audio_seconds": episode.audio.duration_seconds,
                    "segments": len(episode.segments),
                    "execution_providers": episode.transcription.execution_providers,
                }
            )
        )
        return 0
    except Exception as error:
        # External hub/ORT errors do not share a common exception base. Keep the
        # public command diagnostic consistent; interruption still propagates.
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": str(error),
                    "error_type": type(error).__name__,
                    "output": str(output),
                }
            )
        )
        return 1
