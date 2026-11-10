"""Small offline entry point, for local processing and static publication."""

import argparse
import json
import shutil
import subprocess
import sys
from importlib.metadata import version
from pathlib import Path

from pydantic import ValidationError

from podcast_words import catalog
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
    corpus_validation = commands.add_parser(
        "validate-corpus", help="Validate a corpus manifest without expanding paths in the shell"
    )
    corpus_validation.add_argument("--episodes", type=Path, required=True)
    corpus_validation.add_argument("--compatible-processing", action="store_true")
    schema = commands.add_parser("schema", help="Print or save a structural JSON Schema")
    schema.add_argument("--kind", choices=["episode"], default="episode")
    schema.add_argument("--output", type=Path)
    transcription = commands.add_parser(
        "transcribe", help="Transcribe identified audio locally with FP32 on CUDA"
    )
    transcription.add_argument("--metadata", type=Path, required=True)
    transcription.add_argument("--output", type=Path, required=True)
    transcription.add_argument("--cache-dir", type=Path, default=Path(".cache/asr"))
    transcription.add_argument("--run-report", type=Path)
    processing = commands.add_parser(
        "process", help="Process an explicit selection of catalog episodes and resume safely"
    )
    processing.add_argument("--catalog", type=Path, required=True)
    selected = processing.add_mutually_exclusive_group(required=True)
    selected.add_argument("--episode-id", action="append")
    selected.add_argument(
        "--pending", action="store_true", help="Select missing processable episodes"
    )
    processing.add_argument("--limit", type=int, default=10)
    processing.add_argument("--order", choices=["oldest", "newest"], default="oldest")
    processing.add_argument("--output-dir", type=Path, required=True)
    processing.add_argument("--cache-dir", type=Path, default=Path(".cache/asr"))
    processing.add_argument("--retranscribe", action="store_true")
    processing.add_argument("--run-report", type=Path)
    updating = commands.add_parser(
        "update", help="Refresh one configured feed, process missing episodes"
    )
    updating.add_argument("--config", type=Path, default=Path("podcasts.json"))
    updating.add_argument("--podcast", required=True)
    updating.add_argument("--limit", type=int, default=10)
    updating.add_argument("--order", choices=["oldest", "newest"], default="oldest")
    updating.add_argument("--cache-dir", type=Path, default=Path(".cache/asr"))
    updating.add_argument("--run-report", type=Path)
    site = commands.add_parser(
        "prepare-site", help="Prepare every configured podcast without loading models"
    )
    site.add_argument("--config", type=Path, default=Path("podcasts.json"))
    site.add_argument("--output", type=Path, required=True)
    publication = commands.add_parser(
        "publish", help="Prepare one validated, selected static publication source"
    )
    publication.add_argument("--catalog", type=Path, required=True)
    publication.add_argument("--episodes", type=Path, required=True)
    publication.add_argument("--output", type=Path, required=True)
    catalog.add_parser(commands)
    arguments = parser.parse_args(argv)
    if arguments.command == "update":
        from podcast_words.updates import update

        return update(arguments)
    if arguments.command == "prepare-site":
        from podcast_words.site import prepare_site

        try:
            result = prepare_site(arguments.config, arguments.output)
        except (OSError, ValueError) as error:
            print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=True))
            return 1
        print(json.dumps(result, ensure_ascii=True))
        return 0
    if arguments.command == "catalog":
        return catalog.run(arguments)
    if arguments.command == "doctor":
        return doctor()
    if arguments.command == "validate-corpus":
        from podcast_words.publication import relative_episode_paths

        try:
            paths = relative_episode_paths(arguments.episodes)
        except (OSError, ValueError) as error:
            print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=True))
            return 1
        return validate(paths, compatible_processing=arguments.compatible_processing)
    if arguments.command == "validate":
        return validate(arguments.paths, compatible_processing=arguments.compatible_processing)
    if arguments.command == "transcribe":
        from podcast_words.transcribe import transcribe_command

        return transcribe_command(
            arguments.metadata,
            arguments.output,
            arguments.cache_dir,
            run_report=arguments.run_report,
        )
    if arguments.command == "process":
        from podcast_words.processing import process

        return process(arguments)
    if arguments.command == "publish":
        from podcast_words.publication import publish

        return publish(arguments)
    model = Episode
    content = json.dumps(model.model_json_schema(), indent=2, ensure_ascii=False) + "\n"
    if arguments.output:
        arguments.output.parent.mkdir(parents=True, exist_ok=True)
        arguments.output.write_text(content, encoding="utf-8", newline="\n")
    else:
        print(content, end="")
    return 0
