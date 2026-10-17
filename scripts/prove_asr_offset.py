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
    errors = [
        abs(after - before - args.prefix)
        for (_, before), (_, after) in zip(points[0], points[1], strict=False)
    ]
    maximum_error = max(errors) if errors else None
    ok = same_tokens and maximum_error is not None and maximum_error <= 0.08
    with args.audio_file.open("rb") as source:
        checksum = hashlib.file_digest(source, "sha256").hexdigest()
    evidence = {
        "ok": ok,
        "source_sha256": checksum,
        "source_excerpt_start_seconds": args.start,
        "source_excerpt_duration_seconds": original.audio.duration_seconds,
        "known_silence_prefix_seconds": args.prefix,
        "same_native_tokens": same_tokens,
        "native_token_count": len(points[0]),
        "maximum_shift_error_seconds": maximum_error,
        "base_audio_sha256": original.audio.sha256,
        "shifted_audio_sha256": prefixed.audio.sha256,
        "base_first_point": points[0][0] if points[0] else None,
        "shifted_first_point": points[1][0] if points[1] else None,
        "text": " ".join(segment.text for segment in original.segments),
        "runs": reports,
        "quality_scope": "known synthetic time shift; no independent human listening reference",
    }
    (args.output_dir / "evidence.json").write_text(
        json.dumps(evidence, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(json.dumps(evidence, ensure_ascii=True))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
