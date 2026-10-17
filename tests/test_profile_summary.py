"""Existing ONNX traces are summarized through the public CLI artifact boundary."""

import json

from podcast_words.cli import main


def test_profile_summary_reports_file_bytes_provider_counts_host_and_device_times(tmp_path, capsys):
    profile = tmp_path / "encoder.json"
    events = [
        {
            "cat": "Node",
            "name": "encoder_op",
            "ts": 10,
            "dur": 20,
            "args": {"provider": "CPUExecutionProvider"},
        },
        {
            "cat": "Node",
            "name": "encoder_cuda_op",
            "ts": 15,
            "dur": 30,
            "args": {"provider": "CUDAExecutionProvider"},
        },
        {"cat": "Kernel", "name": "cuda_kernel", "ts": 30, "dur": 5, "args": {}},
        {"cat": "Memcpy", "name": "transfer", "ts": 40, "dur": 2, "args": {}},
    ]
    profile.write_text(json.dumps(events), encoding="utf-8")
    output = tmp_path / "summary.json"

    assert (
        main(
            [
                "profile-summary",
                "--profile",
                f"encoder={profile}",
                "--output",
                str(output),
            ]
        )
        == 0
    )
    reported = json.loads(capsys.readouterr().out)
    summary = reported["profiles"][0]
    assert summary["file_bytes"] == profile.stat().st_size
    assert summary["event_count"] == 4
    assert summary["node_events_by_provider"] == {
        "CPUExecutionProvider": 1,
        "CUDAExecutionProvider": 1,
    }
    assert summary["host_node_duration_microseconds_sum_by_provider"] == {
        "CPUExecutionProvider": 20,
        "CUDAExecutionProvider": 30,
    }
    assert summary["kernel_events"] == {"count": 1, "duration_microseconds_sum": 5}
    assert summary["transfer_sync_events"]["Memcpy"] == {
        "count": 1,
        "duration_microseconds_sum": 2,
    }
    assert summary["observed_event_span_microseconds"] == {
        "start": 10,
        "end": 45,
        "duration": 35,
    }
    assert json.loads(output.read_bytes()) == reported


def test_profile_summary_rejects_missing_trace_without_writing_artifact(tmp_path, capsys):
    output = tmp_path / "summary.json"
    assert (
        main(
            [
                "profile-summary",
                "--profile",
                f"encoder={tmp_path / 'missing.json'}",
                "--output",
                str(output),
            ]
        )
        == 1
    )
    assert json.loads(capsys.readouterr().out)["ok"] is False
    assert not output.exists()
