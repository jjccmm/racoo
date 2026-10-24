"""Run the real benchmark cell offline, replacing only its external CLI processes."""

import ast
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from types import SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[1]
EPISODE_ID = "ep-5764a1149f18a8f68698fb45bb405264"
REFERENCE_HASH = "d7f924479192f60229b5ba800227f640bb18a73527e360cc909f3657839327cf"
NEW_AUDIO = b"controlled later delivery of the same podcast episode"


def run_benchmark_cell(tmp_path, *, inputs=None, mutate_after_cold=False, wrong_output_hash=False):
    notebook = json.loads((ROOT / "notebooks/colab.ipynb").read_bytes())
    source = next(
        "".join(cell["source"])
        for cell in notebook["cells"]
        if "def benchmark_run(" in "".join(cell["source"])
    )
    tree = ast.parse(source)
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in (inputs or {}):
                    node.value = ast.Constant(inputs[target.id])
    ast.fix_missing_locations(tree)
    work_dir = tmp_path / "work"
    work_dir.mkdir()
    catalog = tmp_path / "catalog.json"
    catalog.write_text(
        json.dumps(
            {
                "episodes": [
                    {"episode_id": EPISODE_ID, "enclosures": [{"url": "https://example.org/audio"}]}
                ]
            }
        ),
        encoding="utf-8",
    )
    calls = []
    namespace = {
        "work_dir": work_dir,
        "vm_catalog": catalog,
        "drive_root": tmp_path / "drive",
        "runtime_facts": {"gpu": "controlled"},
        "setup_measurements": {},
        "project": ROOT,
        "uv": ["controlled-uv"],
        "Path": Path,
        "json": json,
        "shutil": shutil,
        "os": SimpleNamespace(environ={}),
    }

    def copy_to_drive(source, target):
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    def external_process(command, **kwargs):
        if command[0] == "git":
            stdout = "main\n" if "--show-current" in command else "a" * 40 + "\n"
            return subprocess.CompletedProcess(command, 0, stdout, "")
        calls.append(list(command))
        if "process" not in command:
            assert "download_audio" in " ".join(command)
            target = Path(command[-1])
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(NEW_AUDIO)
            return subprocess.CompletedProcess(command, 0, "", "")
        output = Path(command[command.index("--output-dir") + 1])
        output.mkdir(parents=True, exist_ok=True)
        report_path = Path(command[command.index("--run-report") + 1])
        if "--audio-file" in command:
            audio_path = Path(command[command.index("--audio-file") + 1])
        else:
            audio_path = namespace["audio_file"]
            audio_path.parent.mkdir(parents=True, exist_ok=True)
            audio_path.write_bytes(NEW_AUDIO)
        audio_hash = hashlib.sha256(audio_path.read_bytes()).hexdigest()
        profiled = "--profile" in command
        profile = (
            {"model_node_events": {"CUDAExecutionProvider": 1}, "profile_files": {}}
            if profiled
            else None
        )
        transcript = {
            "audio": {
                "sha256": "0" * 64 if wrong_output_hash else audio_hash,
                "duration_seconds": 100,
            },
            "transcription": {
                "model_id": "controlled-model",
                "model_revision": "controlled-revision",
                "export_id": "controlled-export",
                "export_revision": "controlled-export-revision",
                "configuration_revision": "controlled-configuration",
                "execution_providers": {},
                "runtime_versions": {},
            },
        }
        (output / f"{EPISODE_ID}.json").write_text(json.dumps(transcript), encoding="utf-8")
        report_path.write_text(
            json.dumps(
                {
                    "profile": {
                        "execution_proof": "collected"
                        if profiled
                        else "unavailable-profile-disabled"
                    }
                }
            ),
            encoding="utf-8",
        )
        if mutate_after_cold and output.name == "cold-unprofiled":
            audio_path.write_bytes(b"changed between runs")
        return subprocess.CompletedProcess(
            command, 0, json.dumps({"execution_profile": profile}), ""
        )

    namespace["subprocess"] = SimpleNamespace(run=external_process)
    namespace["atomic_copy"] = copy_to_drive
    return tree, namespace, calls


def execute_cell(tree, namespace):
    exec(compile(tree, "colab-runtime-benchmark", "exec"), namespace)


def test_new_delivery_uses_one_frozen_audio_for_all_runs_and_marks_cpu_mismatch(tmp_path):
    tree, namespace, calls = run_benchmark_cell(tmp_path)
    execute_cell(tree, namespace)

    evidence = namespace["evidence"]
    expected_hash = hashlib.sha256(NEW_AUDIO).hexdigest()
    assert evidence["expected_audio_sha256"] == expected_hash
    assert evidence["recorded_cpu_reference"]["audio_sha256"] == REFERENCE_HASH
    assert evidence["recorded_cpu_reference"]["audio_matches"] is False
    assert evidence["recorded_cpu_reference"]["comparison_status"] == "invalid-different-audio"
    processing_calls = [command for command in calls if "process" in command]
    assert len(processing_calls) == 3
    assert sum("process" not in command for command in calls) == 1
    for command in processing_calls:
        assert command[command.index("--audio-file") + 1] == str(namespace["audio_file"])
        assert "--retranscribe" in command
    assert [record["profile_enabled"] for record in evidence["runs"]] == [False, True, False]
    assert all(
        record["transcript_provenance"]["audio_sha256"] == expected_hash
        for record in evidence["runs"]
    )
    assert evidence["audio_preparation"]["source"] == "downloaded-current-source"
    assert "model/VAD" in evidence["cache_policy"]["cold"]
    assert json.loads(namespace["summary_target"].read_bytes()) == evidence


def test_provided_reference_audio_is_copied_verified_and_never_downloaded(tmp_path):
    source = tmp_path / "recorded-cpu.source"
    source.write_bytes(NEW_AUDIO)
    checksum = hashlib.sha256(NEW_AUDIO).hexdigest()
    tree, namespace, calls = run_benchmark_cell(
        tmp_path,
        inputs={"benchmark_audio_file": str(source), "cpu_reference_audio_sha256": checksum},
    )
    execute_cell(tree, namespace)

    assert len(calls) == 3
    assert namespace["audio_file"] != source
    assert source.read_bytes() == NEW_AUDIO
    assert namespace["evidence"]["recorded_cpu_reference"]["audio_matches"] is True
    assert (
        namespace["evidence"]["recorded_cpu_reference"]["comparison_status"]
        == "matching-audio-other-comparison-conditions-unverified"
    )
    assert namespace["evidence"]["audio_preparation"]["source"] == "provided-local-file"


def test_changed_source_is_rejected_before_a_second_inference(tmp_path):
    tree, namespace, calls = run_benchmark_cell(tmp_path, mutate_after_cold=True)
    with pytest.raises(RuntimeError, match="Frozen benchmark audio changed"):
        execute_cell(tree, namespace)
    assert sum("process" in command for command in calls) == 1


def test_wrong_cli_audio_provenance_still_fails(tmp_path):
    tree, namespace, calls = run_benchmark_cell(tmp_path, wrong_output_hash=True)
    with pytest.raises(RuntimeError, match="Audio mismatch: expected"):
        execute_cell(tree, namespace)
    assert sum("process" in command for command in calls) == 1
    assert namespace["evidence"]["runs"] == []


def test_missing_provided_audio_is_rejected_without_inference(tmp_path):
    tree, namespace, calls = run_benchmark_cell(
        tmp_path, inputs={"benchmark_audio_file": str(tmp_path / "missing.source")}
    )
    with pytest.raises(FileNotFoundError):
        execute_cell(tree, namespace)
    assert not calls
