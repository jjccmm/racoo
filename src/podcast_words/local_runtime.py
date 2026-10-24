"""DLL search paths for the tested local CUDA 11.8 / cuDNN 8 FP32 runtime."""

import ctypes
import os
from pathlib import Path

CUDA_OPTIONS = {
    "arena_extend_strategy": "kSameAsRequested",
    "gpu_mem_limit": str(3 * 1024**3),
    "cudnn_conv_algo_search": "HEURISTIC",
    "cudnn_conv_use_max_workspace": "0",
}
_handles = []


def prepare_runtime(cache_dir: Path) -> None:
    """Use process-local paths; never install drivers or modify the system PATH."""
    if os.name != "nt":
        raise RuntimeError("Local ASR is configured for the tested Windows CUDA-11 GPU runtime")
    cuda = Path(
        os.environ.get(
            "PODCAST_WORDS_CUDA_BIN",
            r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\bin",
        )
    ).resolve()
    extra = (cache_dir / "runtime" / "bin").resolve()
    required = [(extra, "zlibwapi.dll")] + [
        (cuda, name)
        for name in ("cudart64_110.dll", "cublasLt64_11.dll", "cublas64_11.dll", "cudnn64_8.dll")
    ]
    missing = [str(folder / name) for folder, name in required if not (folder / name).is_file()]
    if missing:
        raise RuntimeError(
            "Missing local CUDA runtime files: "
            + ", ".join(missing)
            + "; see docs/asr.md and run scripts/setup_local_asr.py"
        )
    for folder in (extra, cuda):
        _handles.append(os.add_dll_directory(str(folder)))
    for folder, name in required:
        _handles.append(ctypes.WinDLL(str(folder / name)))
