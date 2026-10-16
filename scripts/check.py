"""Run the same fixture-only checks locally and on both CI operating systems."""

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    npm = shutil.which("npm.cmd" if sys.platform == "win32" else "npm")
    if not npm:
        print("npm is missing; install the Node version recorded in .node-version", file=sys.stderr)
        return 1
    commands = [
        [sys.executable, "-m", "ruff", "check", "."],
        [sys.executable, "-m", "ruff", "format", "--check", "."],
        [sys.executable, "-m", "pytest"],
        [sys.executable, "scripts/check_workspace.py"],
        [
            sys.executable,
            "-m",
            "podcast_words",
            "validate",
            "tests/fixtures/synthetic-episode.json",
        ],
        [npm, "--prefix", "web", "run", "build", "--", "--base", "/podcast_words_v3/"],
        [npm, "--prefix", "web", "run", "check"],
    ]
    for command in commands:
        print(f"\n> {' '.join(command)}", flush=True)
        result = subprocess.run(command, cwd=ROOT, check=False)
        if result.returncode:
            return result.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
