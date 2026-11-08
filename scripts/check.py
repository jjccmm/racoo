"""Run the same fixture-only checks locally and on both CI operating systems."""

import os
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
    fixture_environment = {
        **os.environ,
        "PODCAST_WORDS_EPISODES": "tests/fixtures/search-corpus.json",
        "PODCAST_WORDS_ANALYSES": "tests/fixtures/analysis",
    }
    fixture_environment.pop("PODCAST_WORDS_PUBLICATION_SOURCE", None)
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
        [npm, "--prefix", "web", "run", "lint"],
    ]
    for command in commands:
        print(f"\n> {' '.join(command)}", flush=True)
        result = subprocess.run(command, cwd=ROOT, env=fixture_environment, check=False)
        if result.returncode:
            return result.returncode

    for base_path in ("/racoo/", "/"):
        command = [npm, "--prefix", "web", "run", "build"]
        if base_path != "/":
            command.extend(["--", "--base", base_path])
        print(f"\n> {' '.join(command)}", flush=True)
        result = subprocess.run(command, cwd=ROOT, env=fixture_environment, check=False)
        if result.returncode:
            return result.returncode

        command = [npm, "--prefix", "web", "run", "test:browser"]
        environment = {**fixture_environment, "PW_BASE_PATH": base_path}
        port = environment.get("PW_PORT", "4179")
        print(f"\n> {' '.join(command)} (PW_BASE_PATH={base_path}, PW_PORT={port})", flush=True)
        result = subprocess.run(command, cwd=ROOT, env=environment, check=False)
        if result.returncode:
            return result.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
