"""Consistent atomic JSON persistence for pipeline artifacts."""

import json
import os
import tempfile
from collections.abc import Callable
from pathlib import Path


def encode_json(value: object, *, indent: int | None = 2, sort_keys: bool = False) -> bytes:
    options = {"sort_keys": sort_keys, "ensure_ascii": False}
    if indent is None:
        options["separators"] = (",", ":")
    else:
        options["indent"] = indent
    return json.dumps(value, **options).encode("utf-8") + b"\n"


def write_json(
    path: Path,
    value: object,
    *,
    indent: int | None = 2,
    sort_keys: bool = False,
    validate: Callable[[bytes], object] | None = None,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="wb", dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(encode_json(value, indent=indent, sort_keys=sort_keys))
            stream.flush()
            os.fsync(stream.fileno())
        if validate is not None:
            validate(temporary.read_bytes())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
