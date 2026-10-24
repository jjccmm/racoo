"""Bounded ASR experiments for the Colab diagnosis notebook; no production defaults change."""

import argparse
import contextlib
import hashlib
import io
import json
import math
import os
import platform
import shutil
import statistics
import subprocess
import time
import wave
from dataclasses import asdict, dataclass, replace
from datetime import UTC, datetime
from difflib import SequenceMatcher
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

from podcast_words.contracts import Segment
from podcast_words.json_io import write_json
from podcast_words.profile_summary import summarize_profile
from podcast_words.transcribe import (
    EXPORT_ID,
    EXPORT_REVISION,
    MODEL_ID,
    MODEL_REVISION,
    VAD_ID,
    VAD_OPTIONS,
    VAD_REVISION,
    download_audio,
)

CPU = "CPUExecutionProvider"
CUDA = "CUDAExecutionProvider"
ORT_EVENT_LIMIT = 1_000_000


@dataclass(frozen=True)
class Case:
    precision: str = "int8"
    asr_provider: str = CUDA
    vad_provider: str = CUDA
    threads: int = 4
    batch_size: int = 1
    preprocessing: str = "auto"


BASE = Case()
FP32 = replace(BASE, precision="fp32")
CASES = {
    "cuda-int8": BASE,
    "cuda-fp32": FP32,
    "cpu-int8": replace(BASE, asr_provider=CPU, vad_provider=CPU),
    "cuda-int8-threads2": replace(BASE, threads=2),
    "cuda-fp32-vad-cpu": replace(FP32, vad_provider=CPU),
    "cuda-fp32-batch4": replace(FP32, batch_size=4),
    "cuda-fp32-preprocess-cpu": replace(FP32, preprocessing="numpy-cpu"),
}
CONTROLLED_PAIRS = [
    ("cuda-int8", "cuda-fp32", "precision"),
    ("cuda-int8", "cuda-int8-threads2", "threads"),
    ("cuda-fp32", "cuda-fp32-vad-cpu", "vad_provider"),
    ("cuda-fp32", "cuda-fp32-batch4", "batch_size"),
    ("cuda-fp32", "cuda-fp32-preprocess-cpu", "preprocessing"),
]


def file_sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def wav_info(path: Path) -> dict:
    with wave.open(str(path), "rb") as audio:
        if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) != (1, 2, 16000):
            raise ValueError("diagnostic audio must be mono PCM16 at 16 kHz")
        return {
            "file": path.name,
            "sha256": file_sha256(path),
            "bytes": path.stat().st_size,
            "duration_seconds": audio.getnframes() / 16000,
        }


def prepare(
    work: Path,
    *,
    audio_file: Path | None = None,
    audio_url: str | None = None,
    start: float = 300,
    duration: float = 120,
    profile_duration: float = 8,
) -> dict:
    """Freeze one source and derive two exact PCM excerpts before loading any model."""
    if not all(math.isfinite(x) for x in (start, duration, profile_duration)):
        raise ValueError("audio window must be finite")
    if start < 0 or not 0 < profile_duration <= min(duration, 15) or not 0 < duration <= 300:
        raise ValueError("use start >= 0, 0 < duration <= 300, 0 < profile duration <= 15")
    if (audio_file is None) == (audio_url is None):
        raise ValueError("provide exactly one audio file or URL")
    if work.exists():
        raise FileExistsError(f"Choose a new experiment directory: {work}")
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise FileNotFoundError("ffmpeg is required before audio preparation")
    work.mkdir(parents=True)
    started = time.perf_counter()
    source = work / "source.audio"
    if audio_file is None:
        download_audio(audio_url, source)
    else:
        before = file_sha256(audio_file)
        shutil.copyfile(audio_file, source)
        if before != file_sha256(source) or before != file_sha256(audio_file):
            raise ValueError("Source changed during copy")
    source_stage_seconds = time.perf_counter() - started
    decode_started = time.perf_counter()
    excerpt = work / "excerpt.wav"
    subprocess.run(
        [
            ffmpeg,
            "-nostdin",
            "-v",
            "error",
            "-i",
            str(source),
            "-ss",
            str(start),
            "-t",
            str(duration),
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "pcm_s16le",
            str(excerpt),
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=900,
    )
    audio = wav_info(excerpt)
    if abs(audio["duration_seconds"] - duration) > 0.02:
        raise ValueError("Source is too short for the requested excerpt; choose another start")
    with wave.open(str(excerpt), "rb") as full, wave.open(str(work / "profile.wav"), "wb") as short:
        short.setparams(full.getparams())
        short.writeframes(full.readframes(round(profile_duration * 16000)))
    manifest = {
        "schema_version": 1,
        "created_at": datetime.now(UTC).isoformat(),
        "source": {
            "sha256": file_sha256(source),
            "bytes": source.stat().st_size,
            "origin": str(audio_file) if audio_file else audio_url,
            "preparation_seconds": source_stage_seconds,
        },
        "excerpt_start_seconds": start,
        "audio": audio,
        "profile_audio": wav_info(work / "profile.wav"),
        "decode_excerpt_seconds": time.perf_counter() - decode_started,
        "preparation_total_seconds": time.perf_counter() - started,
        "note": "Excerpt times are relative to the excerpt, not a complete episode transcript.",
    }
    write_json(work / "manifest.json", manifest)
    return manifest


def read_manifest(work: Path) -> dict:
    manifest = json.loads((work / "manifest.json").read_bytes())
    for key, filename in (("audio", "excerpt.wav"), ("profile_audio", "profile.wav")):
        if file_sha256(work / filename) != manifest[key]["sha256"]:
            raise ValueError(f"Audio changed: {filename}")
    if file_sha256(work / "source.audio") != manifest["source"]["sha256"]:
        raise ValueError("Audio changed: source.audio")
    return manifest


def runtime_facts() -> dict:
    import onnxruntime as rt

    packages = {}
    for name in ("onnx-asr", "onnxruntime-gpu", "onnxruntime", "numpy", "huggingface-hub"):
        try:
            packages[name] = version(name)
        except PackageNotFoundError:
            pass
    if packages.get("onnx-asr") != "0.12.0" or rt.__version__ != "1.27.0":
        raise RuntimeError("Use the repository's locked onnx-asr 0.12.0 / ORT 1.27.0 environment")
    gpu = None
    if shutil.which("nvidia-smi"):
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,uuid,driver_version,memory.total",
                "--format=csv,noheader",
            ],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        gpu = result.stdout.strip() if result.returncode == 0 else result.stderr.strip()
    return {
        "python": platform.python_version(),
        "platform": platform.platform(),
        "logical_cpu_count": os.cpu_count(),
        "cpu_affinity_count": len(os.sched_getaffinity(0))
        if hasattr(os, "sched_getaffinity")
        else None,
        "packages": packages,
        "ort_build": rt.get_build_info(),
        "available_providers": rt.get_available_providers(),
        "gpu_identity": gpu,
    }


def providers(provider: str) -> list[str]:
    return [CPU] if provider == CPU else [CUDA, CPU]


def load_models(case: Case, work: Path, profile: bool):
    """Use the pinned library API; expensive imports and weights stay out of routine tests."""
    import onnx_asr
    import onnxruntime as rt
    from huggingface_hub import snapshot_download

    if CUDA in (case.asr_provider, case.vad_provider):
        if CUDA not in rt.get_available_providers():
            raise RuntimeError("CUDAExecutionProvider is unavailable; refusing silent CPU fallback")
        debug = io.StringIO()
        with contextlib.redirect_stdout(debug):
            rt.preload_dlls()
        dll_diagnostics = debug.getvalue()
    else:
        dll_diagnostics = None
    downloaded = time.perf_counter()
    files = ["config.json", "vocab.txt"]
    files += (
        ["encoder-model.int8.onnx", "decoder_joint-model.int8.onnx"]
        if case.precision == "int8"
        else ["encoder-model.onnx", "encoder-model.onnx.data", "decoder_joint-model.onnx"]
    )
    model_path = snapshot_download(
        EXPORT_ID,
        revision=EXPORT_REVISION,
        allow_patterns=files,
        cache_dir=str(work.parent / "model-cache"),
    )
    vad_path = snapshot_download(
        VAD_ID,
        revision=VAD_REVISION,
        allow_patterns=["config.json", "silero_vad.onnx"],
        cache_dir=str(work.parent / "model-cache"),
    )
    downloads_seconds = time.perf_counter() - downloaded
    profile_dir = work / "profiles" / (str(time.time_ns()))
    if profile:
        profile_dir.mkdir(parents=True)

    def options(role):
        result = rt.SessionOptions()
        result.intra_op_num_threads = case.threads
        result.enable_profiling = profile
        result.profile_file_prefix = str(profile_dir / role)
        return result

    session_started = time.perf_counter()
    model = onnx_asr.load_model(
        "nemo-parakeet-tdt-0.6b-v3",
        model_path,
        quantization="int8" if case.precision == "int8" else None,
        providers=providers(case.asr_provider),
        sess_options=options("asr"),
        preprocessor_config={
            "use_numpy_preprocessors": True if case.preprocessing == "numpy-cpu" else None,
            "max_concurrent_workers": 1,
            "providers": providers(case.asr_provider),
            "sess_options": options("preprocessor"),
        },
        resampler_config={
            "providers": providers(case.asr_provider),
            "sess_options": options("resampler"),
        },
    )
    vad = onnx_asr.load_vad(
        "silero", vad_path, providers=providers(case.vad_provider), sess_options=options("vad")
    )
    sessions = {
        "encoder": model.asr._encoder,
        "decoder_joint": model.asr._decoder_joint,
        "vad": vad._model,
    }
    preprocessor = model.asr._preprocessor
    inner = getattr(preprocessor, "preprocessor", preprocessor)
    if hasattr(inner, "_preprocessor"):
        sessions["preprocessor"] = inner._preprocessor
    for rate, session in model.resampler._preprocessors.items():
        sessions[f"resampler-{rate}"] = session
    configured = {name: session.get_providers() for name, session in sessions.items()}
    for name in ("encoder", "decoder_joint", "vad"):
        requested = case.vad_provider if name == "vad" else case.asr_provider
        if requested not in configured[name] or (requested == CPU and configured[name] != [CPU]):
            raise RuntimeError(
                f"Requested {requested} absent or wrong for {name}: {configured[name]}"
            )
    setup = {
        "downloads_seconds": downloads_seconds,
        "sessions_seconds": time.perf_counter() - session_started,
        "session_providers": configured,
        "preprocessor_class": type(inner).__name__,
        "preprocessing_note": "auto follows pinned onnx-asr defaults: NumPy for CPU; ONNX Conv for CUDA",
        "cuda_library_preload_messages": dll_diagnostics,
    }
    return (
        model.with_vad(vad, **{**VAD_OPTIONS, "batch_size": case.batch_size}).with_timestamps(),
        sessions,
        setup,
    )


def validated_output(results, duration: float) -> dict:
    segments = []
    previous_end = 0.0
    for result in results:
        if not result.text.strip():
            continue
        if (result.tokens is None) != (result.timestamps is None):
            raise ValueError("Tokens and native timestamps must be supplied together")
        points = [
            {"text": token, "at_seconds": result.start + point}
            for token, point in zip(result.tokens or [], result.timestamps or [], strict=True)
        ]
        segment = Segment.model_validate(
            {
                "id": f"segment-{len(segments) + 1:06d}",
                "text": result.text,
                "start_seconds": result.start,
                "end_seconds": result.end,
                "token_points": points,
            }
        )
        if segment.start_seconds < previous_end or segment.end_seconds > duration:
            raise ValueError("Invalid or overlapping excerpt time boundaries")
        previous_end = segment.end_seconds
        segments.append(segment.model_dump(mode="json"))
    if not segments:
        raise ValueError("No speech recognized: choose a speech-containing excerpt start")
    text = " ".join(segment["text"] for segment in segments)
    return {
        "text": text,
        "segments": segments,
        "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "output_sha256": hashlib.sha256(json.dumps(segments, sort_keys=True).encode()).hexdigest(),
    }


def finish_profiles(sessions: dict) -> dict:
    started = time.perf_counter()
    summaries, paths = {}, set()
    for name, session in sessions.items():
        path = Path(session.end_profiling())
        if path.resolve() in paths:
            raise ValueError("ORT profile paths collided; execution evidence is invalid")
        paths.add(path.resolve())
        summary = summarize_profile(path, name)
        transfers = summary.pop("transfer_sync_events")
        summary["transfer_summary"] = {
            "distinct_event_names": len(transfers),
            "count": sum(x["count"] for x in transfers.values()),
            "top_events": sorted(transfers.items(), key=lambda item: -item[1]["count"])[:8],
        }
        summary["event_limit_reached"] = summary["event_count"] >= ORT_EVENT_LIMIT
        summaries[name] = summary
    cuda_nodes = sum(
        s["node_events_by_provider"].get(CUDA, 0)
        for name, s in summaries.items()
        if name in ("encoder", "decoder_joint")
    )
    return {
        "sessions": summaries,
        "cuda_model_nodes": cuda_nodes,
        "cuda_execution_confirmed": cuda_nodes > 0,
        "event_limit_reached": any(s["event_limit_reached"] for s in summaries.values()),
        "finalize_and_parse_seconds": time.perf_counter() - started,
        "note": "Short placement proof, not a timing comparison. Host durations may overlap; missing Kernel events mean device time is unmeasured.",
    }


def run_case(work: Path, case_name: str, *, repeats: int = 3, profile: bool = False) -> dict:
    if not 3 <= repeats <= 7:
        raise ValueError("Use 3 to 7 timing repetitions")
    case = CASES[case_name]
    path = work / "reports" / f"{case_name}{'-profile' if profile else ''}.json"
    report = {
        "schema_version": 1,
        "case_name": case_name,
        "case": asdict(case),
        "status": "running",
        "profile_enabled": profile,
        "samples": [],
        "started_at": datetime.now(UTC).isoformat(),
        "warmup": None,
        "statistics": None,
        "profile": None,
        "execution_proof": "unavailable-profile-disabled",
    }
    started = time.perf_counter()
    try:
        manifest = read_manifest(work)
        report["manifest_sha256"] = file_sha256(work / "manifest.json")
        report["diagnostic_code_sha256"] = file_sha256(Path(__file__))
        report["runtime"] = runtime_facts()
        report["model"] = {
            "model_id": MODEL_ID,
            "model_revision": MODEL_REVISION,
            "export_id": EXPORT_ID,
            "export_revision": EXPORT_REVISION,
            "vad_id": VAD_ID,
            "vad_revision": VAD_REVISION,
            "vad_options": {**VAD_OPTIONS, "batch_size": case.batch_size},
        }
        report["audio"] = manifest["profile_audio" if profile else "audio"]
        audio = work / ("profile.wav" if profile else "excerpt.wav")
        write_json(path, report)
        model, sessions, report["setup"] = load_models(case, work, profile)

        def recognize():
            read_manifest(work)
            cpu_started = time.process_time()
            wall_started = time.perf_counter()
            results = list(model.recognize(audio))
            wall = time.perf_counter() - wall_started
            cpu = time.process_time() - cpu_started
            read_manifest(work)
            output = validated_output(results, report["audio"]["duration_seconds"])
            return {
                "recognizer_seconds": wall,
                "process_cpu_seconds": cpu,
                "cpu_seconds_per_wall_second": cpu / wall,
                "real_time_factor": wall / report["audio"]["duration_seconds"],
                "text_sha256": output["text_sha256"],
                "output_sha256": output["output_sha256"],
                "segment_count": len(output["segments"]),
            }, output

        if not profile:
            report["warmup"], _ = recognize()
            report["warmup"]["included_in_statistics"] = False
            write_json(path, report)
        for index in range(1 if profile else repeats):
            sample, output = recognize()
            sample["repeat"] = index + 1
            report["samples"].append(sample)
            if index == 0:
                report["sample_output"] = output
            write_json(path, report)
            print(
                f"{case_name}: {'profile' if profile else 'repeat'} {index + 1}: {sample['recognizer_seconds']:.3f}s",
                flush=True,
            )
        if profile:
            report["profile"] = finish_profiles(sessions)
            report["execution_proof"] = "executed-ort-node-events"
        else:
            values = [sample["recognizer_seconds"] for sample in report["samples"]]
            report["statistics"] = {
                "n": len(values),
                "median_seconds": statistics.median(values),
                "min_seconds": min(values),
                "max_seconds": max(values),
                "sample_stdev_seconds": statistics.stdev(values),
                "median_real_time_factor": statistics.median(values)
                / report["audio"]["duration_seconds"],
                "text_stable": len({s["text_sha256"] for s in report["samples"]}) == 1,
                "timestamps_stable": len({s["output_sha256"] for s in report["samples"]}) == 1,
            }
        report["status"] = "completed"
    except Exception as exc:
        report["status"] = "error"
        report["error"] = f"{type(exc).__name__}: {exc}"
        raise
    finally:
        report["worker_elapsed_seconds"] = time.perf_counter() - started
        report["timing_boundary"] = (
            "List materialization of recognize(PCM WAV): includes WAV reading, VAD, preprocessing, encoder/decoder and result creation. Excludes hashes, output validation, setup, profile parsing and Drive. Warmup excluded from timing statistics."
        )
        write_json(path, report)
    return report


def summarize(work: Path) -> dict:
    manifest = read_manifest(work)
    manifest_hash = file_sha256(work / "manifest.json")
    reports = [json.loads(path.read_bytes()) for path in sorted((work / "reports").glob("*.json"))]
    for report in reports:
        if report.get("manifest_sha256") not in (None, manifest_hash):
            raise ValueError("Report belongs to a different experiment; do not compare")
    successful = {
        r["case_name"]: r
        for r in reports
        if r["status"] == "completed" and not r["profile_enabled"]
    }
    comparisons = []
    for baseline, candidate, field in CONTROLLED_PAIRS:
        if baseline not in successful or candidate not in successful:
            continue
        left, right = successful[baseline], successful[candidate]
        for fixed in ("manifest_sha256", "diagnostic_code_sha256", "runtime", "model", "audio"):
            # The batch-size case intentionally changes the recorded VAD batch option.
            left_value, right_value = left[fixed], right[fixed]
            if fixed == "model" and field == "batch_size":
                left_value, right_value = dict(left_value), dict(right_value)
                left_value["vad_options"] = dict(left_value["vad_options"])
                right_value["vad_options"] = dict(right_value["vad_options"])
                left_value["vad_options"].pop("batch_size")
                right_value["vad_options"].pop("batch_size")
            if left_value != right_value:
                raise ValueError(f"Unmatched {fixed}: cannot compare {baseline} / {candidate}")
        comparisons.append(
            {
                "baseline": baseline,
                "candidate": candidate,
                "changed_setting": field,
                "median_speed_ratio_baseline_over_candidate": left["statistics"]["median_seconds"]
                / right["statistics"]["median_seconds"],
                "text_word_sequence_similarity": SequenceMatcher(
                    None,
                    left["sample_output"]["text"].split(),
                    right["sample_output"]["text"].split(),
                    autojunk=False,
                ).ratio(),
                "text_similarity_is_accuracy": False,
                "note": "Observed medians of short warm runs. No human ground truth; review text and timestamps before adopting changes.",
            }
        )
    context_path = work / "notebook-context.json"
    summary = {
        "schema_version": 1,
        "manifest": manifest,
        "manifest_sha256": manifest_hash,
        "notebook_context": json.loads(context_path.read_bytes())
        if context_path.exists()
        else None,
        "reports": reports,
        "controlled_comparisons": comparisons,
        "notes": [
            "CPU control uses the same Colab host/audio. Auto preprocessing differs by provider (CPU NumPy, CUDA ONNX Conv); it is not an isolated provider-only experiment.",
            "Short profiles prove placement for their own prefix only. Their times are not compared with long unprofiled excerpts; profiling overhead is not measured here.",
            "No node-event counts or host-duration sums are GPU/CPU wall-time percentages. Profiles at the event limit are incomplete.",
            "Case order, shared VM contention and clock/thermal drift remain possible confounders; repeat promising comparisons in reversed order.",
            "Outputs are diagnostic excerpts, not publishable episode transcripts or a pilot-quality acceptance.",
        ],
    }
    write_json(work / "diagnostic-report.json", summary)
    return summary


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    prepare_parser = commands.add_parser("prepare")
    prepare_parser.add_argument("--work-dir", type=Path, required=True)
    source = prepare_parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--audio-file", type=Path)
    source.add_argument("--audio-url")
    prepare_parser.add_argument("--start", type=float, default=300)
    prepare_parser.add_argument("--duration", type=float, default=120)
    prepare_parser.add_argument("--profile-duration", type=float, default=8)
    run_parser = commands.add_parser("run")
    run_parser.add_argument("--work-dir", type=Path, required=True)
    run_parser.add_argument("--case", choices=CASES, required=True)
    run_parser.add_argument("--repeats", type=int, default=3)
    run_parser.add_argument("--profile", action="store_true")
    summary_parser = commands.add_parser("summarize")
    summary_parser.add_argument("--work-dir", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "prepare":
            prepare(
                args.work_dir,
                audio_file=args.audio_file,
                audio_url=args.audio_url,
                start=args.start,
                duration=args.duration,
                profile_duration=args.profile_duration,
            )
        elif args.command == "run":
            run_case(args.work_dir, args.case, repeats=args.repeats, profile=args.profile)
        else:
            summarize(args.work_dir)
    except Exception as exc:
        print(f"{type(exc).__name__}: {exc}", flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
