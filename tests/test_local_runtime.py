"""Exercise Windows DLL setup without requiring or loading CUDA in routine tests."""

import ctypes
from pathlib import Path
from types import SimpleNamespace

from podcast_words import local_runtime


def test_relative_cache_paths_are_resolved_before_windows_dll_setup(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    cuda = tmp_path / "cuda"
    extra = tmp_path / "cache/runtime/bin"
    cuda.mkdir()
    extra.mkdir(parents=True)
    names = ("cudart64_110.dll", "cublasLt64_11.dll", "cublas64_11.dll", "cudnn64_8.dll")
    for name in names:
        (cuda / name).write_bytes(b"fixture")
    (extra / "zlibwapi.dll").write_bytes(b"fixture")
    paths = []
    loaded = []
    monkeypatch.setattr(
        local_runtime,
        "os",
        SimpleNamespace(
            name="nt",
            environ={"PODCAST_WORDS_CUDA_BIN": "cuda"},
            add_dll_directory=lambda p: paths.append(p),
        ),
    )
    monkeypatch.setattr(ctypes, "WinDLL", lambda p: loaded.append(p), raising=False)
    monkeypatch.setattr(local_runtime, "_handles", [])
    local_runtime.prepare_runtime(Path("cache"))
    assert paths == [str(extra), str(cuda)]
    assert all(Path(p).is_absolute() for p in loaded)
    assert len(loaded) == 5
