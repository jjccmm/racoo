"""Expose the hash-locked dev wheel's binary under the normal ffmpeg command name."""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from importlib.metadata import version
from pathlib import Path

import imageio_ffmpeg


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, default=Path(".cache/ci-ffmpeg"))
    args = parser.parse_args()
    # Select the wheel's bundled executable directly, independent of system
    # FFmpeg or IMAGEIO_FFMPEG_EXE overrides on a developer machine.
    binaries = Path(imageio_ffmpeg.__file__).parent / "binaries"
    candidates = [path for path in binaries.glob("ffmpeg-*") if path.is_file()]
    if len(candidates) != 1:
        raise RuntimeError(f"expected one bundled FFmpeg executable in {binaries}")
    args.directory.mkdir(parents=True, exist_ok=True)
    destination = args.directory.resolve() / ("ffmpeg.exe" if sys.platform == "win32" else "ffmpeg")
    shutil.copy2(candidates[0], destination)
    result = subprocess.run(
        [str(destination), "-version"], capture_output=True, text=True, check=True, timeout=10
    )
    if path_file := os.environ.get("GITHUB_PATH"):
        with Path(path_file).open("a", encoding="utf-8") as output:
            output.write(str(destination.parent) + "\n")
    with destination.open("rb") as binary:
        checksum = hashlib.file_digest(binary, "sha256").hexdigest()
    print(
        json.dumps(
            {
                "ffmpeg": str(destination),
                "version": result.stdout.splitlines()[0],
                "sha256": checksum,
                "imageio-ffmpeg": version("imageio-ffmpeg"),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
