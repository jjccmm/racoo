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
    assert summary["kernel_events"] == {
        "count": 1,
        "timed_count": 1,
        "duration_microseconds_sum": 5,
    }
    assert summary["transfer_sync_events"]["Memcpy"] == {
        "count": 1,
        "timed_count": 1,
        "duration_microseconds_sum": 2,
    }
    assert summary["observed_event_timestamp_span_microseconds"] == {
        "start": 10,
        "end": 40,
        "duration": 30,
    }
    assert summary["latest_timed_event_end_microseconds"] == 45
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


def test_profile_summary_rejects_malformed_trace_without_overwriting_input(tmp_path, capsys):
    profile = tmp_path / "raw.json"
    profile.write_text('[{"cat":"Node"},,{}]', encoding="utf-8")
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
        == 1
    )
    assert json.loads(capsys.readouterr().out)["ok"] is False
    assert profile.read_text(encoding="utf-8") == '[{"cat":"Node"},,{}]'
    assert not output.exists()


def test_profile_summary_output_cannot_alias_valid_input(tmp_path, capsys):
    profile = tmp_path / "raw.json"
    original = json.dumps([{"cat": "Node", "dur": 3}])
    profile.write_text(original, encoding="utf-8")

    assert (
        main(["profile-summary", "--profile", f"encoder={profile}", "--output", str(profile)]) == 1
    )
    assert json.loads(capsys.readouterr().out)["ok"] is False
    assert profile.read_text(encoding="utf-8") == original


def test_profile_summary_classifies_node_memcpy_and_keeps_untimed_events_unknown(tmp_path, capsys):
    profile = tmp_path / "cuda.json"
    profile.write_text(
        json.dumps(
            [
                {
                    "cat": "Node",
                    "name": "MemcpyFromHostToDevice_kernel_time",
                    "args": {"provider": "CUDAExecutionProvider", "op_name": "Memcpy"},
                },
                {
                    "cat": "Node",
                    "name": "encoder_op_kernel_time",
                    "dur": 5,
                    "args": {"provider": "CUDAExecutionProvider", "op_name": "Conv"},
                },
                {
                    "cat": "Node",
                    "name": "rare_expensive_kernel_time",
                    "dur": 100,
                    "args": {"provider": "CUDAExecutionProvider", "op_name": "Decode"},
                },
            ]
        ),
        encoding="utf-8",
    )

    assert main(["profile-summary", "--profile", f"encoder={profile}"]) == 0
    summary = json.loads(capsys.readouterr().out)["profiles"][0]
    assert summary["host_node_duration_microseconds_sum_by_provider"] == {
        "CUDAExecutionProvider": 105
    }
    assert summary["untimed_event_count"] == 1
    assert summary["transfer_sync_events"]["MemcpyFromHostToDevice_kernel_time"]["count"] == 1
    assert summary["top_node_operators_by_provider"]["CUDAExecutionProvider"][0] == {
        "op_name": "Decode",
        "count": 1,
        "timed_count": 1,
        "duration_microseconds_sum": 100,
    }


def test_profile_summary_rejects_trailing_data_and_negative_durations(tmp_path, capsys):
    profile = tmp_path / "bad.json"
    for content in (
        '[{"cat":"Node"}] trailing',
        '[{"cat":"Kernel","dur":-1}]',
        "[{},,{}]",
        "[null]",
        '[{"cat":"Kernel","dur":NaN}]',
    ):
        profile.write_text(content, encoding="utf-8")
        assert main(["profile-summary", "--profile", f"encoder={profile}"]) == 1
        assert json.loads(capsys.readouterr().out)["ok"] is False
