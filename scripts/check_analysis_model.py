"""Explicit real-model integration proof; never run by the ordinary offline check."""

import argparse
import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    arguments = parser.parse_args()
    cache = ROOT / ".cache"
    cache.mkdir(exist_ok=True)
    expected = {
        "der": {"count": 1, "stopword": True},
        "hund": {"count": 2, "stopword": False},
        "laufen": {"count": 2, "stopword": False},
        "ein": {"count": 1, "stopword": True},
    }
    text = "Die Hunde laufen. Ein Hund läuft!"
    with TemporaryDirectory(prefix="analysis-model-", dir=cache) as temporary:
        directory = Path(temporary)
        episode = json.loads(
            (ROOT / "tests/fixtures/synthetic-episode.json").read_text(encoding="utf-8")
        )
        episode["segments"] = [episode["segments"][0]]
        episode["segments"][0].update(text=text, token_points=[])
        (directory / "episode.json").write_text(json.dumps(episode), encoding="utf-8")
        (directory / "corpus.json").write_text('["episode.json"]', encoding="utf-8")
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "podcast_words",
                "analyze",
                "--episodes",
                str(directory / "corpus.json"),
                "--output",
                str(directory / "analyses"),
                "--publish",
                str(directory / "public"),
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode:
            print(result.stdout + result.stderr, file=sys.stderr)
            return result.returncode
        analysis = json.loads(
            (directory / "analyses/synthetic-episode-001.json").read_text(encoding="utf-8")
        )
        report = {
            "checked_at": datetime.now(UTC).isoformat(),
            "text": text,
            "boundary": "public analyze command to saved analysis and 64 publication shards",
            "expected_total_words": 6,
            "expected_lemmas": expected,
            "actual_total_words": analysis["total_words"],
            "actual_lemmas": analysis["lemmas"],
            "settings": analysis["settings"],
            "command_result": json.loads(result.stdout),
            "passed": analysis["total_words"] == 6 and analysis["lemmas"] == expected,
        }
    content = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if arguments.output:
        arguments.output.parent.mkdir(parents=True, exist_ok=True)
        arguments.output.write_text(content, encoding="utf-8")
    print(content, end="")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
