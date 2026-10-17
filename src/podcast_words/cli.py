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
from podcast_words.revisions import validate_compatible_processing


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
                "asr": "not loaded or tested by this check",
            },
            indent=2,
        )
    )
    return 0 if ready else 1


def validate(paths: list[Path], *, compatible_processing: bool = False) -> int:
    failed = False
    results = []
    episodes = []
    for path in paths:
        try:
            episode = Episode.model_validate_json(path.read_bytes())
        except (OSError, ValidationError) as error:
            failed = True
            results.append({"path": str(path), "ok": False, "error": str(error)})
        else:
            results.append({"path": str(path), "ok": True, "episode_id": episode.episode_id})
            episodes.append(episode)
    if compatible_processing and not failed:
        try:
            validate_compatible_processing(episodes)
        except ValueError as error:
            failed = True
            results.append({"ok": False, "error": str(error)})
    print(json.dumps(results, indent=2, ensure_ascii=True))
    return 1 if failed else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="podcast-words")
    parser.add_argument("--version", action="version", version=version("podcast-words"))
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("doctor", help="Check Python and FFmpeg without loading models")
    validation = commands.add_parser("validate", help="Validate episode JSON files offline")
    validation.add_argument("--compatible-processing", action="store_true")
    validation.add_argument("paths", type=Path, nargs="+")
    schema = commands.add_parser("schema", help="Print or save a structural JSON Schema")
    schema.add_argument("--kind", choices=["episode", "analysis"], default="episode")
    schema.add_argument("--output", type=Path)
    transcription = commands.add_parser("transcribe", help="Transcribe identified audio on CPU")
    transcription.add_argument("--metadata", type=Path, required=True)
    transcription.add_argument("--output", type=Path, required=True)
    transcription.add_argument("--audio-file", type=Path)
    transcription.add_argument("--cache-dir", type=Path, default=Path(".cache/asr"))
    processing = commands.add_parser(
        "process", help="Process an explicit selection of catalog episodes and resume safely"
    )
    processing.add_argument("--catalog", type=Path, required=True)
    processing.add_argument("--episode-id", action="append", required=True)
    processing.add_argument("--output-dir", type=Path, required=True)
    processing.add_argument("--cache-dir", type=Path, default=Path(".cache/asr"))
    processing.add_argument("--retranscribe", action="store_true")
    publication = commands.add_parser(
        "publish", help="Prepare one validated, selected static publication source"
    )
    publication.add_argument("--catalog", type=Path, required=True)
    publication.add_argument("--episodes", type=Path, required=True)
    publication.add_argument("--analyses", type=Path, required=True)
    publication.add_argument("--output", type=Path, required=True)
    publication.add_argument("--analysis-version", default=analysis.ANALYSIS_VERSION)
    result_import = commands.add_parser(
        "import-results", help="Safely import completed episode JSON from another run"
    )
    result_import.add_argument("--catalog", type=Path, required=True)
    result_import.add_argument("--input-dir", type=Path, required=True)
    result_import.add_argument("--output-dir", type=Path, required=True)
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
        return validate(arguments.paths, compatible_processing=arguments.compatible_processing)
    if arguments.command == "transcribe":
        from podcast_words.transcribe import transcribe_command

        return transcribe_command(
            arguments.metadata, arguments.output, arguments.cache_dir, arguments.audio_file
        )
    if arguments.command == "process":
        from podcast_words.processing import process

        return process(arguments)
    if arguments.command == "publish":
        from podcast_words.publication import publish

        return publish(arguments)
    if arguments.command == "import-results":
        from podcast_words.result_import import import_results

        return import_results(arguments)
    model = analysis.Analysis if arguments.kind == "analysis" else Episode
    content = json.dumps(model.model_json_schema(), indent=2, ensure_ascii=False) + "\n"
    if arguments.output:
        arguments.output.parent.mkdir(parents=True, exist_ok=True)
        arguments.output.write_text(content, encoding="utf-8", newline="\n")
    else:
        print(content, end="")
    return 0
