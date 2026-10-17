"""Summarize existing ONNX Runtime JSON traces without loading them into memory."""

import json
import math
from collections import Counter
from pathlib import Path

from podcast_words.json_io import write_json

MAX_REPORTED_OPERATORS = 25


class _JSONArrayStream:
    """Incrementally decode one strict JSON array, compacting at chunk boundaries."""

    def __init__(self, path: Path, chunk_size: int = 1024 * 1024):
        self.path = path
        self.source = path.open("r", encoding="utf-8")
        self.chunk_size = chunk_size
        self.buffer = ""
        self.position = 0
        self.eof = False
        self.decoder = json.JSONDecoder(parse_constant=self._reject_constant)

    @staticmethod
    def _reject_constant(value):
        raise ValueError(f"invalid JSON number {value}")

    def close(self):
        self.source.close()

    def _fill(self) -> bool:
        if self.eof:
            return self.position < len(self.buffer)
        if self.position >= len(self.buffer):
            self.buffer = ""
            self.position = 0
        elif self.position >= self.chunk_size:
            self.buffer = self.buffer[self.position :]
            self.position = 0
        chunk = self.source.read(self.chunk_size)
        if not chunk:
            self.eof = True
            return self.position < len(self.buffer)
        self.buffer += chunk
        return True

    def _skip_whitespace(self):
        while True:
            while self.position < len(self.buffer) and self.buffer[self.position].isspace():
                self.position += 1
            if self.position < len(self.buffer) or self.eof:
                return
            self._fill()

    def _peek(self):
        self._skip_whitespace()
        if self.position < len(self.buffer):
            return self.buffer[self.position]
        return None

    def _expect(self, token: str):
        if self._peek() != token:
            raise ValueError(f"invalid JSON profile array framing: {self.path}")
        self.position += 1

    def _value(self):
        while True:
            self._skip_whitespace()
            try:
                value, end = self.decoder.raw_decode(self.buffer, self.position)
                self.position = end
                return value
            except json.JSONDecodeError:
                if self.eof:
                    raise ValueError(
                        f"invalid or incomplete JSON event in profile: {self.path}"
                    ) from None
                self._fill()

    def events(self):
        self._expect("[")
        if self._peek() == "]":
            self.position += 1
            self._finish()
            return
        while True:
            event = self._value()
            if not isinstance(event, dict):
                raise ValueError(f"ORT profile events must be JSON objects: {self.path}")
            yield event
            delimiter = self._peek()
            if delimiter == ",":
                self.position += 1
                if self._peek() == "]":
                    raise ValueError(f"trailing comma in ORT profile array: {self.path}")
                continue
            if delimiter == "]":
                self.position += 1
                self._finish()
                return
            raise ValueError(f"invalid JSON profile array framing: {self.path}")

    def _finish(self):
        self._skip_whitespace()
        if self.position < len(self.buffer) or not self.eof:
            if self.position < len(self.buffer):
                raise ValueError(f"unexpected data after ORT profile array: {self.path}")
            if self._fill():
                self._skip_whitespace()
                if self.position < len(self.buffer):
                    raise ValueError(f"unexpected data after ORT profile array: {self.path}")
        if not self.eof:
            raise ValueError(f"incomplete JSON profile array: {self.path}")


def _finite_number(value, label: str, path: Path, *, nonnegative=False):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"ORT profile {label} must be a finite number: {path}")
    result = float(value)
    if not math.isfinite(result) or (nonnegative and result < 0):
        requirement = "finite and nonnegative" if nonnegative else "finite"
        raise ValueError(f"ORT profile {label} must be {requirement}: {path}")
    return result


def _operator_name(event: dict) -> str:
    args = event.get("args")
    args = args if isinstance(args, dict) else {}
    return str(args.get("op_name") or event.get("name") or "unknown")


def _transfer_label(event: dict):
    args = event.get("args")
    args = args if isinstance(args, dict) else {}
    candidates = [event.get("cat", ""), event.get("name", ""), args.get("op_name", "")]
    label = next(
        (
            str(candidate)
            for candidate in candidates
            if any(
                word in str(candidate).lower() for word in ("memcpy", "copy", "transfer", "sync")
            )
        ),
        None,
    )
    return label


def summarize_profile(path: Path, session: str) -> dict:
    """Stream one ORT trace and retain bounded counts, durations and its observed span."""
    category_counts = Counter()
    node_events = Counter()
    node_timed_events = Counter()
    host_node_duration_us = Counter()
    operator_stats = {}
    kernel_count = 0
    kernel_timed_count = 0
    kernel_duration_us = 0.0
    transfer_sync_events = {}
    earliest_timestamp = None
    latest_timestamp = None
    latest_timed_end = None
    event_count = 0
    untimed_event_count = 0
    stream = _JSONArrayStream(path)
    try:
        for event in stream.events():
            event_count += 1
            category = str(event.get("cat", ""))
            category_counts[category] += 1
            duration = _finite_number(event.get("dur"), "duration", path, nonnegative=True)
            timestamp = _finite_number(event.get("ts"), "timestamp", path)
            if duration is None:
                untimed_event_count += 1
            if timestamp is not None:
                earliest_timestamp = (
                    timestamp if earliest_timestamp is None else min(earliest_timestamp, timestamp)
                )
                latest_timestamp = (
                    timestamp if latest_timestamp is None else max(latest_timestamp, timestamp)
                )
                if duration is not None:
                    end = timestamp + duration
                    latest_timed_end = (
                        end if latest_timed_end is None else max(latest_timed_end, end)
                    )

            args = event.get("args")
            args = args if isinstance(args, dict) else {}
            if category == "Node":
                provider = args.get("provider")
                if provider:
                    node_events[provider] += 1
                    op_name = _operator_name(event)
                    operator = operator_stats.setdefault(
                        (provider, op_name), {"count": 0, "timed_count": 0, "duration_sum": 0.0}
                    )
                    operator["count"] += 1
                    if duration is not None:
                        node_timed_events[provider] += 1
                        host_node_duration_us[provider] += duration
                        operator["timed_count"] += 1
                        operator["duration_sum"] += duration
            elif category == "Kernel":
                kernel_count += 1
                if duration is not None:
                    kernel_timed_count += 1
                    kernel_duration_us += duration

            transfer_label = _transfer_label(event)
            if transfer_label:
                transfer = transfer_sync_events.setdefault(
                    transfer_label,
                    {"count": 0, "timed_count": 0, "duration_microseconds_sum": 0.0},
                )
                transfer["count"] += 1
                if duration is not None:
                    transfer["timed_count"] += 1
                    transfer["duration_microseconds_sum"] += duration
    finally:
        stream.close()

    top_operators = {}
    for provider in node_events:
        values = [
            {
                "op_name": name,
                "count": stats["count"],
                "timed_count": stats["timed_count"],
                "duration_microseconds_sum": (
                    stats["duration_sum"] if stats["timed_count"] else None
                ),
            }
            for (event_provider, name), stats in operator_stats.items()
            if event_provider == provider
        ]
        values.sort(
            key=lambda item: (
                -(item["duration_microseconds_sum"] or 0),
                -item["count"],
                item["op_name"],
            )
        )
        top_operators[provider] = values[:MAX_REPORTED_OPERATORS]
    for transfer in transfer_sync_events.values():
        if not transfer["timed_count"]:
            transfer["duration_microseconds_sum"] = None

    return {
        "session": session,
        "path": str(path),
        "file_bytes": path.stat().st_size,
        "event_count": event_count,
        "untimed_event_count": untimed_event_count,
        "category_counts": dict(category_counts),
        "node_events_by_provider": dict(node_events),
        "timed_node_events_by_provider": dict(node_timed_events),
        "host_node_duration_microseconds_sum_by_provider": dict(host_node_duration_us),
        "top_node_operators_by_provider": top_operators,
        "kernel_events": {
            "count": kernel_count,
            "timed_count": kernel_timed_count,
            "duration_microseconds_sum": kernel_duration_us if kernel_timed_count else None,
        },
        "transfer_sync_events": transfer_sync_events,
        "observed_event_timestamp_span_microseconds": (
            {
                "start": earliest_timestamp,
                "end": latest_timestamp,
                "duration": latest_timestamp - earliest_timestamp,
            }
            if earliest_timestamp is not None and latest_timestamp is not None
            else None
        ),
        "latest_timed_event_end_microseconds": latest_timed_end,
        "duration_note": (
            "Node durations are host operator times and can overlap. Kernel durations are device "
            "times only when cat=Kernel events are present and timed. Missing durations are unknown, "
            "not zero. Transfer/sync names are heuristic matches over event category/name/op_name."
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
        paths = []
        for value in arguments.profile:
            session, path = parse_profile_argument(value)
            if session in names:
                raise ValueError(f"duplicate profile session: {session}")
            if not path.is_file():
                raise FileNotFoundError(f"profile file does not exist: {path}")
            names.add(session)
            paths.append(path)
        if not paths:
            raise ValueError("at least one --profile SESSION=PATH is required")
        if arguments.output and arguments.output.resolve() in {path.resolve() for path in paths}:
            raise ValueError("summary output must not alias any input profile")
        profiles = [
            summarize_profile(path, session)
            for (session, path) in map(parse_profile_argument, arguments.profile)
        ]
        result = {"schema_version": 1, "profiles": profiles}
        if arguments.output:
            write_json(arguments.output, result)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=True))
        return 1
