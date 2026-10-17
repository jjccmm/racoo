"""Small offline entry point, shared by local execution and Colab."""

import argparse
import json
import shutil
import subprocess
import sys
from importlib.metadata import version
from pathlib import Path

from pydantic import ValidationError

from podcast_words import analysis, catalog
from podcast_words.contracts import Episode


def doctor() -> int:
    ffmpeg = shutil.which("ffmpeg")
    ffmpeg_version = None
    if ffmpeg:
        try:
            result = subprocess.run(
                [ffmpeg, "-version"], capture_output=True, text=True, timeout=10, check=True
            )
            ffmpeg_version = result.stdout.splitlines()[0]
        except (OSError, subprocess.SubprocessError, IndexError):
            pass
    ready = ffmpeg_version is not None
    print(
        json.dumps(
            {
                "ok": ready,
                "python": sys.version.split()[0],
                "executable": sys.executable,
                "ffmpeg": ffmpeg,
                "ffmpeg_version": ffmpeg_version,
                "asr": "not installed or tested by this check",
            },
            indent=2,
        )
    )
    return 0 if ready else 1


def validate(paths: list[Path]) -> int:
    failed = False
    results = []
    for path in paths:
        try:
            episode = Episode.model_validate_json(path.read_bytes())
        except (OSError, ValidationError) as error:
            failed = True
            results.append({"path": str(path), "ok": False, "error": str(error)})
        else:
            results.append({"path": str(path), "ok": True, "episode_id": episode.episode_id})
    print(json.dumps(results, indent=2, ensure_ascii=True))
    return 1 if failed else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="podcast-words")
    parser.add_argument("--version", action="version", version=version("podcast-words"))
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("doctor", help="Check Python and FFmpeg without loading models")
    validation = commands.add_parser("validate", help="Validate episode JSON files offline")
    validation.add_argument("paths", type=Path, nargs="+")
    schema = commands.add_parser("schema", help="Print or save a structural JSON Schema")
    schema.add_argument("--kind", choices=["episode", "analysis"], default="episode")
    schema.add_argument("--output", type=Path)
    catalog.add_parser(commands)
    analysis.add_parser(commands)
    arguments = parser.parse_args(argv)
    if arguments.command == "analyze":
        return analysis.run(arguments)
    if arguments.command == "catalog":
        return catalog.run(arguments)
    if arguments.command == "doctor":
        return doctor()
    if arguments.command == "validate":
        return validate(arguments.paths)
    model = analysis.Analysis if arguments.kind == "analysis" else Episode
    content = json.dumps(model.model_json_schema(), indent=2, ensure_ascii=False) + "\n"
    if arguments.output:
        arguments.output.parent.mkdir(parents=True, exist_ok=True)
        arguments.output.write_text(content, encoding="utf-8", newline="\n")
    else:
        print(content, end="")
    return 0
