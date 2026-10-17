"""Explicit real-model integration experiment; excluded from routine checks.

Compare a short real excerpt with the same bytes preceded by a known silence.
The resulting episodes are marked synthetic and stay under the operator's cache.
This proves the real adapter's time reference, not human transcript quality.
"""

import argparse
import contextlib
import hashlib
import io
import json
import subprocess
import wave
from pathlib import Path

from podcast_words.cli import main as cli
from podcast_words.contracts import Episode


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-file", type=Path, required=True)
    parser.add_argument("--start", type=float, required=True)
    parser.add_argument("--duration", type=float, default=20)
    parser.add_argument("--prefix", type=int, default=60)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--cache-dir", type=Path, default=Path(".cache/asr"))
    parser.add_argument(
        "--reuse", action="store_true", help="Validate and compare existing results"
    )
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    base = args.output_dir / "base.wav"
    shifted = args.output_dir / "shifted.wav"
    subprocess.run(
        [
            "ffmpeg",
            "-nostdin",
            "-v",
            "error",
            "-y",
            "-i",
            str(args.audio_file),
            "-ss",
            str(args.start),
            "-t",
            str(args.duration),
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "pcm_s16le",
            str(base),
        ],
        check=True,
        timeout=900,
    )
    with wave.open(str(base), "rb") as source, wave.open(str(shifted), "wb") as destination:
        destination.setparams(source.getparams())
        destination.writeframes(b"\0\0" * 16000 * args.prefix)
        destination.writeframes(source.readframes(source.getnframes()))
    episodes = []
    reports = []
    evidence_path = args.output_dir / "evidence.json"
    previous = (
        json.loads(evidence_path.read_text(encoding="utf-8")) if evidence_path.exists() else {}
    )
    for name, audio in [("base", base), ("shifted", shifted)]:
        metadata = args.output_dir / f"{name}-input.json"
        metadata.write_text(
            json.dumps(
                {
                    "podcast_id": "synthetic-asr-experiment",
                    "episode_id": name,
                    "source": {
                        "kind": "synthetic",
                        "key": name,
                        "reference_url": "https://example.invalid/synthetic-asr-timing",
                    },
                    "title": f"Synthetischer Zeitversuch: {name}",
                    "published_at": "2026-10-16T00:00:00Z",
                    "audio_url": f"https://example.invalid/{name}.wav",
                }
            ),
            encoding="utf-8",
        )
        output = args.output_dir / f"{name}-episode.json"
        report_path = args.output_dir / f"{name}-run.json"
        if args.reuse:
            episode = Episode.model_validate_json(output.read_bytes())
            with audio.open("rb") as current_audio:
                if hashlib.file_digest(current_audio, "sha256").hexdigest() != episode.audio.sha256:
                    raise ValueError("existing result does not match this experiment's audio")
            episodes.append(episode)
            if report_path.exists():
                reports.append(json.loads(report_path.read_text(encoding="utf-8")))
            continue
        captured = io.StringIO()
        with contextlib.redirect_stdout(captured):
            status = cli(
                [
                    "transcribe",
                    "--metadata",
                    str(metadata),
                    "--audio-file",
                    str(audio),
                    "--output",
                    str(output),
                    "--cache-dir",
                    str(args.cache_dir),
                ]
            )
        report = json.loads(captured.getvalue())
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        reports.append(report)
        if status:
            print(json.dumps(report))
            return status
        episodes.append(Episode.model_validate_json(output.read_bytes()))
    original, prefixed = episodes
    points = [
        [
            (point.text, point.at_seconds)
            for segment in episode.segments
            for point in segment.token_points
        ]
        for episode in episodes
    ]
    same_tokens = [text for text, _ in points[0]] == [text for text, _ in points[1]]
    # VAD's recurrent state can change an endpoint by a frame after silence.
    # Compare every segment boundary, and native points for unchanged token
    # sequences. Different lexical output cannot be paired token-by-token.
    boundary_errors = []
    errors = []
    changed_sequences = 0
    same_segment_count = len(original.segments) == len(prefixed.segments)
    paired_segments = (
        zip(original.segments, prefixed.segments, strict=True) if same_segment_count else []
    )
    for before, after in paired_segments:
        boundary_errors.extend(
            [
                abs(after.start_seconds - before.start_seconds - args.prefix),
                abs(after.end_seconds - before.end_seconds - args.prefix),
            ]
        )
        if [point.text for point in before.token_points] != [
            point.text for point in after.token_points
        ]:
            changed_sequences += 1
            continue
        errors.extend(
            abs(right.at_seconds - left.at_seconds - args.prefix)
            for left, right in zip(before.token_points, after.token_points, strict=True)
        )
    maximum_error = max(errors) if errors else None
    maximum_boundary_error = max(boundary_errors) if boundary_errors else None
    ok = (
        maximum_error is not None
        and maximum_error <= 0.08
        and maximum_boundary_error is not None
        and maximum_boundary_error <= 0.08
    )
    with args.audio_file.open("rb") as source:
        checksum = hashlib.file_digest(source, "sha256").hexdigest()
    evidence = {
        "ok": ok,
        "comparison_status": "passed"
        if ok
        else ("inconclusive-segmentation" if not same_segment_count else "failed"),
        "source_sha256": checksum,
        "source_excerpt_start_seconds": args.start,
        "source_excerpt_duration_seconds": original.audio.duration_seconds,
        "known_silence_prefix_seconds": args.prefix,
        "same_native_tokens": same_tokens,
        "same_segment_count": same_segment_count,
        "base_segment_count": len(original.segments),
        "prefixed_segment_count": len(prefixed.segments),
        "native_token_count": len(points[0]),
        "prefixed_native_token_count": len(points[1]),
        "compared_unchanged_native_points": len(errors),
        "changed_native_sequences": changed_sequences,
        "maximum_shift_error_seconds": maximum_error,
        "maximum_boundary_shift_error_seconds": maximum_boundary_error,
        "base_audio_sha256": original.audio.sha256,
        "shifted_audio_sha256": prefixed.audio.sha256,
        "base_first_point": points[0][0] if points[0] else None,
        "shifted_first_point": points[1][0] if points[1] else None,
        "text": " ".join(segment.text for segment in original.segments),
        "runs": reports or previous.get("runs", []),
        "quality_scope": "known synthetic time shift; no independent human listening reference",
    }
    evidence_path.write_text(
        json.dumps(evidence, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(json.dumps(evidence, ensure_ascii=True))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
