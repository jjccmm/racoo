"""Summarize existing ONNX Runtime JSON traces without loading them into memory."""

import json
from pathlib import Path


def _events(path: Path, chunk_size: int = 1024 * 1024):
    decoder = json.JSONDecoder()
    buffer = ""
    first = True
    with path.open("r", encoding="utf-8") as source:
        while True:
            buffer = buffer.lstrip()
            if not buffer:
                chunk = source.read(chunk_size)
                if not chunk:
                    raise ValueError(f"incomplete JSON profile array: {path}")
                buffer = chunk
                continue
            if first:
                if not buffer.startswith("["):
                    raise ValueError(f"ORT profile must be a JSON array: {path}")
                buffer = buffer[1:]
                first = False
                continue
            buffer = buffer.lstrip()
            if buffer.startswith(","):
                buffer = buffer[1:]
                continue
            if buffer.startswith("]"):
                return
            try:
                event, end = decoder.raw_decode(buffer)
            except json.JSONDecodeError:
                chunk = source.read(chunk_size)
                if not chunk:
                    raise ValueError(f"incomplete JSON event in profile: {path}") from None
                buffer += chunk
                continue
            yield event
            buffer = buffer[end:]


def summarize_profile(path: Path, session: str) -> dict:
    """Stream one ORT trace and retain event counts, durations and its observed span."""
    category_counts = {}
    node_events = {}
    host_node_duration_us = {}
    kernel_events = {"count": 0, "duration_microseconds_sum": 0.0}
    transfer_sync_events = {}
    earliest = None
    latest = None
    event_count = 0

    for event in _events(path):
        event_count += 1
        category = str(event.get("cat", ""))
        category_counts[category] = category_counts.get(category, 0) + 1
        duration = float(event.get("dur", 0) or 0)
        timestamp = event.get("ts")
        if timestamp is not None:
            timestamp = float(timestamp)
            earliest = timestamp if earliest is None else min(earliest, timestamp)
            end = timestamp + duration
            latest = end if latest is None else max(latest, end)

        if category == "Node":
            provider = event.get("args", {}).get("provider")
            if provider:
                node_events[provider] = node_events.get(provider, 0) + 1
                host_node_duration_us[provider] = (
                    host_node_duration_us.get(provider, 0.0) + duration
                )
        elif category == "Kernel":
            kernel_events["count"] += 1
            kernel_events["duration_microseconds_sum"] += duration
        elif any(word in category.lower() for word in ("memcpy", "copy", "transfer", "sync")):
            transfer = transfer_sync_events.setdefault(
                category, {"count": 0, "duration_microseconds_sum": 0.0}
            )
            transfer["count"] += 1
            transfer["duration_microseconds_sum"] += duration

    return {
        "session": session,
        "path": str(path),
        "file_bytes": path.stat().st_size,
        "event_count": event_count,
        "category_counts": category_counts,
        "node_events_by_provider": node_events,
        "host_node_duration_microseconds_sum_by_provider": host_node_duration_us,
        "kernel_events": kernel_events,
        "transfer_sync_events": transfer_sync_events,
        "observed_event_span_microseconds": (
            {"start": earliest, "end": latest, "duration": latest - earliest}
            if earliest is not None and latest is not None
            else None
        ),
        "duration_note": (
            "Node durations are host operator times and can overlap. Kernel durations are device "
            "times only when cat=Kernel events are present. Event sums are not wall-clock time."
        ),
    }


def parse_profile_argument(value: str) -> tuple[str, Path]:
    """Parse the public CLI value SESSION=PATH."""
    session, separator, raw_path = value.partition("=")
    if not separator or not session or not raw_path:
        raise ValueError("profiles use SESSION=PATH, for example encoder=/path/encoder.json")
    return session, Path(raw_path)


def profile_summary(arguments) -> int:
    try:
        names = set()
        profiles = []
        for value in arguments.profile:
            session, path = parse_profile_argument(value)
            if session in names:
                raise ValueError(f"duplicate profile session: {session}")
            if not path.is_file():
                raise FileNotFoundError(f"profile file does not exist: {path}")
            names.add(session)
            profiles.append(summarize_profile(path, session))
        if not profiles:
            raise ValueError("at least one --profile SESSION=PATH is required")
        result = {"schema_version": 1, "profiles": profiles}
        content = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
        if arguments.output:
            arguments.output.parent.mkdir(parents=True, exist_ok=True)
            arguments.output.write_text(content, encoding="utf-8", newline="\n")
        print(content, end="")
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=True))
        return 1
