"""Atomic persistence survives short Windows readers without exposing partial JSON."""

import ctypes
import json
import sys
import threading

import pytest

from podcast_words.json_io import write_json
from podcast_words.publication import replace_generated_directory


def hold_reader(target):
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.CreateFileW.argtypes = [
        ctypes.c_wchar_p,
        ctypes.c_uint32,
        ctypes.c_uint32,
        ctypes.c_void_p,
        ctypes.c_uint32,
        ctypes.c_uint32,
        ctypes.c_void_p,
    ]
    kernel.CreateFileW.restype = ctypes.c_void_p
    kernel.CloseHandle.argtypes = [ctypes.c_void_p]
    handle = kernel.CreateFileW(
        str(target), 0x80000000, 3, None, 3, 0x02000000 if target.is_dir() else 0x80, None
    )
    assert handle != ctypes.c_void_p(-1).value, ctypes.get_last_error()
    return lambda: kernel.CloseHandle(handle)


@pytest.mark.skipif(sys.platform != "win32", reason="Windows sharing semantics")
def test_atomic_json_replace_survives_a_short_reader_without_delete_sharing(tmp_path):
    target = tmp_path / "count.json"
    write_json(target, {"count": 1})
    close = hold_reader(target)
    release = threading.Timer(0.12, close)
    release.start()
    try:
        write_json(target, {"count": 2})
    finally:
        release.join()
    assert json.loads(target.read_bytes()) == {"count": 2}
    assert sorted(path.name for path in tmp_path.iterdir()) == ["count.json"]


@pytest.mark.skipif(sys.platform != "win32", reason="Windows sharing semantics")
def test_atomic_json_permanent_lock_fails_with_original_intact_and_no_tempfile(tmp_path):
    target = tmp_path / "count.json"
    write_json(target, {"count": 1})
    close = hold_reader(target)
    try:
        with pytest.raises(PermissionError):
            write_json(target, {"count": 2})
    finally:
        close()
    assert json.loads(target.read_bytes()) == {"count": 1}
    assert sorted(path.name for path in tmp_path.iterdir()) == ["count.json"]


@pytest.mark.skipif(sys.platform != "win32", reason="Windows sharing semantics")
def test_atomic_directory_replace_survives_short_reader(tmp_path):
    staging = tmp_path / "staging"
    staging.mkdir()
    write_json(staging / "manifest.json", {"generatedBy": "podcast-words publish", "value": 2})
    close = hold_reader(staging)
    release = threading.Timer(0.12, close)
    release.start()
    try:
        replace_generated_directory(staging, tmp_path / "output")
    finally:
        release.join()
    assert json.loads((tmp_path / "output/manifest.json").read_bytes())["value"] == 2
    assert not staging.exists()


@pytest.mark.skipif(sys.platform != "win32", reason="Windows sharing semantics")
def test_permanently_locked_directory_restores_previous_publication(tmp_path):
    output, staging = tmp_path / "output", tmp_path / "staging"
    write_json(output / "manifest.json", {"generatedBy": "podcast-words publish", "value": 1})
    write_json(staging / "manifest.json", {"generatedBy": "podcast-words publish", "value": 2})
    close = hold_reader(staging)
    try:
        with pytest.raises(PermissionError):
            replace_generated_directory(staging, output)
    finally:
        close()
    assert json.loads((output / "manifest.json").read_bytes())["value"] == 1
