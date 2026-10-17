"""Identified audio to validated episode; Windows CPU and Colab share this adapter."""

import hashlib
import json
import os
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
EXECUTION_PROVIDER_ENV = "PODCAST_WORDS_EXECUTION_PROVIDER"
CPU_PROVIDER = "CPUExecutionProvider"
GPU_PROVIDER = "CUDAExecutionProvider"


def execution_provider() -> str:
    provider = os.environ.get(EXECUTION_PROVIDER_ENV, CPU_PROVIDER)
    if provider not in {CPU_PROVIDER, GPU_PROVIDER}:
        raise ValueError(f"unsupported execution provider {provider!r}")
    return provider


def execution_provider_chain() -> list[str]:
    provider = execution_provider()
    return [CPU_PROVIDER] if provider == CPU_PROVIDER else [provider, CPU_PROVIDER]


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

    def __init__(self, cache_dir: Path, *, profile_enabled: bool | None = None):
        initialization_started = time.monotonic()
        import onnx_asr
        import onnxruntime
        from huggingface_hub import snapshot_download

        self.cache_dir = cache_dir
        self.execution_provider = execution_provider()
        self.profile_enabled = (
            self.execution_provider == GPU_PROVIDER if profile_enabled is None else profile_enabled
        )
        self.measurements = {"schema_version": 1, "model": {}, "episode": {}}
        self.profile_measurements = {}
        self.measurements["runtime"] = {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "processor": platform.processor() or None,
            "logical_cpu_count": os.cpu_count(),
            "execution_provider": self.execution_provider,
            "execution_provider_chain": execution_provider_chain(),
            "intra_op_num_threads": 4,
        }
        profile_dir = cache_dir / "profiles"
        if self.profile_enabled:
            profile_dir.mkdir(parents=True, exist_ok=True)
        model_files = [
            "config.json",
            "vocab.txt",
            "encoder-model.int8.onnx",
            "decoder_joint-model.int8.onnx",
        ]
        vad_files = ["config.json", "silero_vad.onnx"]
        model_stage, model_bytes_before = self._snapshot_stage(
            EXPORT_ID, EXPORT_REVISION, model_files
        )
        model_started = time.monotonic()
        model_path = snapshot_download(
            EXPORT_ID,
            revision=EXPORT_REVISION,
            cache_dir=str(cache_dir / "models"),
            allow_patterns=model_files,
        )
        self.measurements["model"]["model_parameters_lookup_download"] = self._snapshot_result(
            model_stage, model_started, Path(model_path), model_files, model_bytes_before
        )
        vad_stage, vad_bytes_before = self._snapshot_stage(VAD_ID, VAD_REVISION, vad_files)
        vad_started = time.monotonic()
        vad_path = snapshot_download(
            VAD_ID,
            revision=VAD_REVISION,
            cache_dir=str(cache_dir / "models"),
            allow_patterns=vad_files,
        )
        self.measurements["model"]["vad_lookup_download"] = self._snapshot_result(
            vad_stage, vad_started, Path(vad_path), vad_files, vad_bytes_before
        )
        options = onnxruntime.SessionOptions()
        options.intra_op_num_threads = 4
        if self.profile_enabled:
            options.enable_profiling = True
            options.profile_file_prefix = str(profile_dir / "onnxruntime")
        asr_started = time.monotonic()
        model = onnx_asr.load_model(
            "nemo-parakeet-tdt-0.6b-v3",
            model_path,
            quantization="int8",
            providers=execution_provider_chain(),
            sess_options=options,
        )
        self.measurements["model"]["encoder_decoder_session_initialization"] = {
            "elapsed_seconds": round(time.monotonic() - asr_started, 6)
        }
        vad_init_started = time.monotonic()
        vad = onnx_asr.load_vad(
            "silero",
            vad_path,
            providers=execution_provider_chain(),
            sess_options=options,
        )
        self.measurements["model"]["vad_session_initialization"] = {
            "elapsed_seconds": round(time.monotonic() - vad_init_started, 6)
        }
        # onnx-asr 0.12.0 has no public provider-report API. Read the actual sessions,
        # rather than recording get_available_providers() or requested configuration.
        self.execution_providers = {
            "encoder": model.asr._encoder.get_providers(),
            "decoder_joint": model.asr._decoder_joint.get_providers(),
            "vad": vad._model.get_providers(),
        }
        if self.execution_provider == CPU_PROVIDER:
            if any(value != [CPU_PROVIDER] for value in self.execution_providers.values()):
                raise RuntimeError("CPU run did not obtain CPU-only inference sessions")
        elif any(
            GPU_PROVIDER not in self.execution_providers[name]
            for name in ("encoder", "decoder_joint")
        ):
            raise RuntimeError("requested CUDA provider is absent from an ASR model session")
        self.profile_sessions = {
            "encoder": model.asr._encoder,
            "decoder_joint": model.asr._decoder_joint,
            "vad": vad._model,
        }
        self.model = model.with_vad(vad, **VAD_OPTIONS).with_timestamps()
        self.measurements["model"]["total_session_initialization_seconds"] = round(
            time.monotonic() - initialization_started, 6
        )

    def _snapshot_stage(self, repository: str, revision: str, filenames: list[str]):
        cache_root = self.cache_dir / "models"
        repository_dir = cache_root / f"models--{repository.replace('/', '--')}"
        snapshot_dir = repository_dir / "snapshots" / revision
        available = {name for name in filenames if (snapshot_dir / name).is_file()}
        return {
            "repository": repository,
            "revision": revision,
            "expected_files": filenames,
            "files_present_before": sorted(available),
            "materialized_bytes_before": sum(
                (snapshot_dir / name).stat().st_size for name in available
            ),
        }, sum((snapshot_dir / name).stat().st_size for name in available)

    @staticmethod
    def _snapshot_result(stage, started, snapshot_path, filenames, bytes_before):
        present = {name for name in filenames if (snapshot_path / name).is_file()}
        bytes_after = sum((snapshot_path / name).stat().st_size for name in present)
        before_files = set(stage["files_present_before"])
        return {
            **stage,
            "files_present_after": sorted(present),
            "materialized_bytes_after": bytes_after,
            "materialized_bytes_added": max(0, bytes_after - bytes_before),
            "wire_bytes_downloaded": None,
            "cache_status": (
                "warm" if before_files == set(filenames) else "partial" if before_files else "cold"
            ),
            "elapsed_seconds": round(time.monotonic() - started, 6),
        }

    def finish(self) -> dict | None:
        """Close ORT profiles and report node assignments from actual execution."""
        if not self.profile_enabled:
            return None
        from podcast_words.profile_summary import summarize_profile

        node_events = {}
        node_durations_us = {}
        kernel_events = {}
        transfer_sync_events = {}
        profile_summaries = {}
        profile_files = {}
        observed_paths = set()
        finalize_started = time.monotonic()
        parse_seconds = 0.0
        for name, session in self.profile_sessions.items():
            profile_path = Path(session.end_profiling())
            resolved_path = profile_path.resolve()
            if resolved_path in observed_paths:
                raise RuntimeError("ONNX Runtime sessions returned a shared profile file path")
            observed_paths.add(resolved_path)
            if not profile_path.is_file():
                raise RuntimeError(
                    f"ONNX Runtime profile file is missing for {name}: {profile_path}"
                )
            named_profile = self.cache_dir / "profiles" / f"{name}-{profile_path.name}"
            if named_profile.exists():
                raise RuntimeError(
                    f"ONNX Runtime profile destination already exists: {named_profile}"
                )
            profile_path.replace(named_profile)
            profile_files[name] = str(named_profile)
            parse_started = time.monotonic()
            summary = summarize_profile(named_profile, name)
            parse_seconds += time.monotonic() - parse_started
            node_events[name] = summary["node_events_by_provider"]
            node_durations_us[name] = summary["host_node_duration_microseconds_sum_by_provider"]
            kernel_events[name] = summary["kernel_events"]
            transfer_sync_events[name] = summary["transfer_sync_events"]
            profile_summaries[name] = summary
        model_events = {
            provider: sum(
                events.get(provider, 0) for name, events in node_events.items() if name != "vad"
            )
            for provider in (GPU_PROVIDER, CPU_PROVIDER)
        }
        if self.execution_provider == GPU_PROVIDER and model_events[GPU_PROVIDER] == 0:
            raise RuntimeError("ONNX Runtime profile recorded no CUDA model node executions")
        self.profile_measurements = {
            "status": "captured",
            "execution_proof": "executed-ort-node-events",
            "node_events": node_events,
            "host_node_event_duration_microseconds_sum": node_durations_us,
            "model_node_events": model_events,
            "mixed_cpu_fallback": (
                self.execution_provider == GPU_PROVIDER and model_events[CPU_PROVIDER] > 0
            ),
            "finalization_and_parse_seconds": round(time.monotonic() - finalize_started, 6),
            "parse_seconds": round(parse_seconds, 6),
            "profile_bytes": {
                name: Path(path).stat().st_size for name, path in profile_files.items()
            },
            "sessions": profile_summaries,
            "transfer_sync_events": transfer_sync_events,
            "kernel_events": kernel_events,
            "duration_note": "ORT Node durations are host operator times in microseconds and may overlap across threads. GPU kernel durations are reported only for cat=Kernel events; they are absent unless the ORT GPU profiling build and CUPTI support provide them. Event duration sums are not wall-clock time.",
        }
        return {
            "node_events": node_events,
            "model_node_events": model_events,
            "profile_files": profile_files,
        }

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
            "bytes": audio_file.stat().st_size,
            "wire_bytes_downloaded": audio_file.stat().st_size
            if download_status == "downloaded"
            else 0,
        }
        with audio_file.open("rb") as original:
            checksum = hashlib.file_digest(original, "sha256").hexdigest()
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
                "execution_proof": (
                    "pending-profile" if self.profile_enabled else "unavailable-profile-disabled"
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
                            "onnxruntime-gpu"
                            if self.execution_provider == GPU_PROVIDER
                            else "onnxruntime",
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
        validation_started = time.monotonic()
        episode = Episode.model_validate_json(json.dumps(data))
        self.measurements["episode"]["input"] = {
            "audio_sha256": episode.audio.sha256,
            "audio_bytes": audio_file.stat().st_size,
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
    profile_enabled: bool | None = None,
) -> int:
    started = time.monotonic()
    try:
        if output.exists():
            raise FileExistsError(f"output already exists; choose another destination: {output}")
        metadata = EpisodeInput.model_validate_json(metadata_path.read_bytes())
        transcriber = Transcriber(cache_dir, profile_enabled=profile_enabled)
        episode = transcriber.transcribe(metadata, audio_file)
        execution_profile = transcriber.finish()
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
        transcriber.measurements["profile"] = transcriber.profile_measurements or {
            "status": "disabled",
            "execution_proof": "unavailable-profile-disabled",
        }
        transcriber.measurements["total_elapsed_seconds"] = round(time.monotonic() - started, 6)
        transcriber.measurements["code_revision"] = os.environ.get("PODCAST_WORDS_CODE_REVISION")
        if run_report:
            run_report.parent.mkdir(parents=True, exist_ok=True)
            run_report.write_text(
                json.dumps(transcriber.measurements, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
                newline="\n",
            )
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
                    "execution_profile": execution_profile,
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
