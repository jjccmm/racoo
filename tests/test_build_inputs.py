"""Public static builds reject incompatible selected recognition configurations."""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_custom_episode_build_rejects_incompatible_recognition_configuration(tmp_path):
    fixtures = ROOT / "tests" / "fixtures"
    first = json.loads((fixtures / "synthetic-episode.json").read_bytes())
    second = json.loads((fixtures / "search" / "second-episode.json").read_bytes())
    second["transcription"]["model_revision"] = "deliberately-incompatible-fixture-model"
    (tmp_path / "first.json").write_text(json.dumps(first), encoding="utf-8")
    (tmp_path / "second.json").write_text(json.dumps(second), encoding="utf-8")
    (tmp_path / "episodes.json").write_text(
        json.dumps(["first.json", "second.json"]), encoding="utf-8"
    )
    analyses = tmp_path / "analyses"
    analyses.mkdir()
    for name in ("synthetic-episode-001.json", "synthetic-episode-002.json"):
        shutil.copyfile(fixtures / "analysis" / name, analyses / name)
    output = tmp_path / "dist"
    npm = shutil.which("npm.cmd" if sys.platform == "win32" else "npm")
    assert npm is not None, "Node/npm is required for the public static build check"
    environment = {
        **os.environ,
        "UV_NO_SYNC": "1",
        "PODCAST_WORDS_EPISODES": str(tmp_path / "episodes.json"),
        "PODCAST_WORDS_ANALYSES": str(analyses),
    }

    result = subprocess.run(
        [npm, "--prefix", "web", "run", "build", "--", "--outDir", str(output)],
        cwd=ROOT,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
        timeout=180,
    )

    assert result.returncode != 0, result.stdout + result.stderr
    assert "incompatible transcription configurations" in result.stdout + result.stderr
