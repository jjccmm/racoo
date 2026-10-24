"""Local FP32 CUDA transcription of one exact, retained audio version."""

import hashlib
import json
import os
import platform
import shutil
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
from podcast_words.json_io import require_distinct_output, write_json
from podcast_words.local_runtime import CUDA_OPTIONS, prepare_runtime

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
CPU_PROVIDER = "CPUExecutionProvider"
GPU_PROVIDER = "CUDAExecutionProvider"


def processing_configuration() -> dict:
    return {
        "model_id": MODEL_ID,
        "model_revision": MODEL_REVISION,
        "export_id": EXPORT_ID,
        "export_revision": EXPORT_REVISION,
        "quantization": "fp32",
        "vad_id": VAD_ID,
        "vad_revision": VAD_REVISION,
        "vad_options": VAD_OPTIONS.copy(),
        "intra_op_num_threads": 4,
        "asr_provider": GPU_PROVIDER,
        "vad_provider": CPU_PROVIDER,
        "preprocessing": "numpy-cpu",
        "cuda_provider_options": CUDA_OPTIONS.copy(),
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
    """Load FP32 once per local run; retain every transcribed audio version by hash."""

    def __init__(self, cache_dir: Path):
        initialization_started = time.monotonic()
        prepare_runtime(cache_dir)
        import onnx_asr
        import onnxruntime
        from huggingface_hub import snapshot_download

        if GPU_PROVIDER not in onnxruntime.get_available_providers():
            raise RuntimeError("CUDAExecutionProvider is unavailable; local ASR requires the GPU")
        self.cache_dir = cache_dir
        self.measurements = {"schema_version": 1, "model": {}, "episode": {}}
        self.measurements["runtime"] = {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "processor": platform.processor() or None,
            "logical_cpu_count": os.cpu_count(),
            "execution_provider": GPU_PROVIDER,
            "intra_op_num_threads": 4,
        }
        self.measurements["processing_configuration"] = processing_configuration()
        files = [
            "config.json",
            "vocab.txt",
            "encoder-model.onnx",
            "encoder-model.onnx.data",
            "decoder_joint-model.onnx",
        ]
        local_dir = cache_dir / "models" / EXPORT_REVISION / "fp32"
        before = [name for name in files if (local_dir / name).is_file()]
        model_started = time.monotonic()
        # Keep graph and external data as ordinary siblings, including on newer ORT.
        model_path = snapshot_download(
            EXPORT_ID,
            revision=EXPORT_REVISION,
            cache_dir=str(cache_dir / "models"),
            local_dir=str(local_dir),
            allow_patterns=files,
        )
        self.measurements["model"]["model_parameters_lookup_download"] = {
            "cache_status": "warm"
            if len(before) == len(files)
            else "partial"
            if before
            else "cold",
            "elapsed_seconds": round(time.monotonic() - model_started, 6),
            "wire_bytes_downloaded": None,
        }
        vad_started = time.monotonic()
        vad_path = snapshot_download(
            VAD_ID,
            revision=VAD_REVISION,
            cache_dir=str(cache_dir / "models"),
            allow_patterns=["config.json", "silero_vad.onnx"],
        )
        self.measurements["model"]["vad_lookup_download"] = {
            "elapsed_seconds": round(time.monotonic() - vad_started, 6),
            "wire_bytes_downloaded": None,
        }

        def options():
            result = onnxruntime.SessionOptions()
            result.intra_op_num_threads = 4
            return result

        asr_started = time.monotonic()
        model = onnx_asr.load_model(
            "nemo-parakeet-tdt-0.6b-v3",
            model_path,
            quantization=None,
            providers=[(GPU_PROVIDER, CUDA_OPTIONS), CPU_PROVIDER],
            sess_options=options(),
            preprocessor_config={"use_numpy_preprocessors": True, "max_concurrent_workers": 1},
            resampler_config={"providers": [CPU_PROVIDER], "sess_options": options()},
        )
        self.measurements["model"]["encoder_decoder_session_initialization"] = {
            "elapsed_seconds": round(time.monotonic() - asr_started, 6)
        }
        vad_started = time.monotonic()
        vad = onnx_asr.load_vad(
            "silero", vad_path, providers=[CPU_PROVIDER], sess_options=options()
        )
        self.measurements["model"]["vad_session_initialization"] = {
            "elapsed_seconds": round(time.monotonic() - vad_started, 6)
        }
        self.execution_providers = {
            "encoder": model.asr._encoder.get_providers(),
            "decoder_joint": model.asr._decoder_joint.get_providers(),
            "vad": vad._model.get_providers(),
        }
        if any(
            GPU_PROVIDER not in self.execution_providers[name]
            for name in ("encoder", "decoder_joint")
        ):
            raise RuntimeError("requested CUDA provider is absent from an ASR model session")
        self.model = model.with_vad(vad, **VAD_OPTIONS).with_timestamps()
        self.measurements["model"][
            "model_setup_total_including_imports_lookup_and_sessions_seconds"
        ] = round(time.monotonic() - initialization_started, 6)
        self.measurements["model"]["model_setup_timing_note"] = (
            "Outer setup includes runtime imports, cache lookups and nested ASR/VAD initialization; do not add sub-times again."
        )

    def transcribe(self, metadata: EpisodeInput, audio_file: Path | None = None) -> Episode:
        """Decode the exact input, recognize speech and validate absolute episode times."""
        audio_dir = self.cache_dir / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)
        download_started = time.monotonic()
        download_status = "provided-local-file"
        if audio_file is None:
            key = hashlib.sha256(str(metadata.audio_url).encode()).hexdigest()
            audio_file = audio_dir / f"{key}.source"
            download_status = "downloaded"
            download_audio(str(metadata.audio_url), audio_file)
        self.measurements["episode"]["audio_download"] = {
            "status": download_status,
            "elapsed_seconds": round(time.monotonic() - download_started, 6),
            "payload_bytes_saved": audio_file.stat().st_size,
            "wire_bytes_downloaded": 0 if download_status == "provided-local-file" else None,
        }
        with audio_file.open("rb") as original:
            checksum = hashlib.file_digest(original, "sha256").hexdigest()
        # A URL identifies the source, not its ad-dependent audio version.
        suffix = audio_file.suffix.lower()
        if suffix not in {".mp3", ".wav", ".m4a", ".ogg", ".flac"}:
            suffix = Path(str(metadata.audio_url).split("?", 1)[0]).suffix.lower()
        if suffix not in {".mp3", ".wav", ".m4a", ".ogg", ".flac"}:
            suffix = ".audio"
        reference = audio_dir / f"{checksum}{suffix}"
        if not reference.exists():
            shutil.copyfile(audio_file, reference)
        with reference.open("rb") as saved:
            if hashlib.file_digest(saved, "sha256").hexdigest() != checksum:
                raise ValueError("retained audio reference checksum does not match input")
        if download_status == "downloaded" and audio_file != reference:
            audio_file.unlink()
        audio_file = reference
        decode_started = time.monotonic()
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
            self.measurements["episode"]["decode"] = {
                "elapsed_seconds": round(time.monotonic() - decode_started, 6),
                "decoded_audio_seconds": duration,
            }
            segments = []
            inference_started = time.monotonic()
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
            self.measurements["episode"]["inference"] = {
                "elapsed_seconds": round(time.monotonic() - inference_started, 6),
                "execution_proof": "session-providers-recorded; timing run is not profiled",
                "boundary": (
                    "recognizer generator iteration including VAD/preprocessing and result assembly; "
                    "not pure encoder, decoder or GPU kernel time"
                ),
            }
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
                            "onnxruntime-gpu",
                            "numpy",
                            "huggingface-hub",
                            "podcast-words",
                        ]
                    },
                },
                "execution_providers": self.execution_providers,
                "configuration": {
                    "quantization": "fp32",
                    "upstream_revision_role": "selected metadata revision; export linkage unattested",
                    "vad_id": VAD_ID,
                    "vad_revision": VAD_REVISION,
                    "vad_options": json.dumps(VAD_OPTIONS, sort_keys=True),
                    "audio_decode": "ffmpeg mono PCM s16le 16000 Hz; original full timeline",
                    "token_times": "segment-relative seconds + VAD start, once",
                    "intra_op_num_threads": "4",
                    "asr_provider": GPU_PROVIDER,
                    "vad_provider": CPU_PROVIDER,
                    "preprocessing": "numpy-cpu",
                    "cuda_provider_options": json.dumps(CUDA_OPTIONS, sort_keys=True),
                },
            },
            "segments": segments,
        }
        with audio_file.open("rb") as saved:
            if hashlib.file_digest(saved, "sha256").hexdigest() != checksum:
                raise ValueError("reference audio changed during transcription")
        validation_started = time.monotonic()
        episode = Episode.model_validate_json(json.dumps(data))
        self.measurements["episode"]["input"] = {
            "audio_sha256": episode.audio.sha256,
            "audio_bytes": audio_file.stat().st_size,
            "reference_audio_file": str(reference),
            "source_url_is_fixed_audio_version": False,
            "decoded_duration_seconds": episode.audio.duration_seconds,
        }
        self.measurements["episode"]["validation"] = {
            "elapsed_seconds": round(time.monotonic() - validation_started, 6)
        }
        return episode


def transcribe_command(
    metadata_path: Path,
    output: Path,
    cache_dir: Path,
    audio_file: Path | None = None,
    *,
    run_report: Path | None = None,
) -> int:
    started = time.monotonic()
    try:
        if run_report:
            require_distinct_output(
                run_report,
                [metadata_path, output, audio_file],
                label="run report",
            )
        if output.exists():
            raise FileExistsError(f"output already exists; choose another destination: {output}")
        metadata = EpisodeInput.model_validate_json(metadata_path.read_bytes())
        transcriber = Transcriber(cache_dir)
        episode = transcriber.transcribe(metadata, audio_file)
        output.parent.mkdir(parents=True, exist_ok=True)
        serialization_started = time.monotonic()
        content = episode.model_dump_json(indent=2) + "\n"
        with output.open("x", encoding="utf-8", newline="\n") as destination:
            destination.write(content)
        transcriber.measurements["episode"]["serialization"] = {
            "elapsed_seconds": round(time.monotonic() - serialization_started, 6),
            "bytes": len(content.encode("utf-8")),
        }
        transcriber.measurements["episode"]["validation_and_serialization"] = {
            "elapsed_seconds": round(
                transcriber.measurements["episode"]["validation"]["elapsed_seconds"]
                + transcriber.measurements["episode"]["serialization"]["elapsed_seconds"],
                6,
            ),
            "validation_seconds": transcriber.measurements["episode"]["validation"][
                "elapsed_seconds"
            ],
            "serialization_seconds": transcriber.measurements["episode"]["serialization"][
                "elapsed_seconds"
            ],
        }
        transcriber.measurements["total_elapsed_seconds"] = round(time.monotonic() - started, 6)
        transcriber.measurements["total_elapsed_boundary"] = (
            "Starts inside transcribe_command() and ends before writing the optional run report "
            "and stdout; excludes interpreter/uv startup and environment installation."
        )
        transcriber.measurements["code_revision"] = os.environ.get("PODCAST_WORDS_CODE_REVISION")
        if run_report:
            try:
                write_json(run_report, transcriber.measurements)
            except OSError as error:
                print(
                    json.dumps(
                        {
                            "ok": False,
                            "error": f"could not write run report {run_report}: {error}",
                            "completed_artifact_preserved": str(output),
                        },
                        ensure_ascii=True,
                    )
                )
                return 1
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
                    "runtime_measurements": transcriber.measurements,
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
