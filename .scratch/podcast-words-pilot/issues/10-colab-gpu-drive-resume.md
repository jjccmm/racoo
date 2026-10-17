# 10: Resume the shared workflow on Colab GPU and Drive

**What to build:** An operator can manually start the same processing workflow in Colab, persist each completed episode on Drive, and resume in a new session with a verified GPU provider.

**Blocked by:** 09: Resume selected episode processing without losing work.

**Status:** claimed

**Spec coverage:** User stories 37, 38, 39, 40, 41, 52 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** The same public CLI invoked by the thin notebook, validated Drive checkpoints, and a separately captured actual Colab execution report.

**Human involvement:** The operator must make a Colab runtime and Drive available and start the notebook. Implementation alone cannot substitute for the real run evidence.

- [x] Keep the notebook thin and use the shared Python package/run-resume commands rather than reimplementing the pipeline.
- [ ] Establish a locked compatible GPU runtime for the same model/export configuration; record the allocated GPU, driver/runtime facts, and execution provider actually used for inference.
- [ ] Keep temporary audio on the VM and persist a validated completed result to Drive after each episode before proceeding.
- [ ] Demonstrate a new-session resume from durable Drive results without reprocessing completed episodes; partial results remain explicitly incomplete.
- [ ] Record difficult excerpts and at least one complete real episode on Colab GPU, including absolute-time behavior across speech sections and pauses.
- [ ] Document actual start, resume, checkpoint, and result-transfer steps; unavailable GPU access or a notebook that has not run stays an unmet criterion.
- [x] Keep live Colab/Drive/GPU work separate from the fixture-only Windows/Linux check path.


## Comments

- 2026-10-17: Added a thin Colab notebook that selects the mutually exclusive locked GPU dependency group, calls the shared `process` CLI per episode, keeps audio/models/profiles in VM storage, and checkpoints validated per-episode JSON plus run metadata to Drive before proceeding. It reuses valid Drive checkpoints in a new session and refuses to count provider availability alone as GPU proof. The optional difficult-excerpt workflow calls the shared `transcribe` CLI and stores offset-adjusted excerpt evidence separately from full episode results.
- 2026-10-17: Added provider selection and ONNX Runtime node-event profiling to the shared transcriber. Reports distinguish actual encoder/decoder/VAD session providers from executed model-node provider counts and identify mixed CPU fallback. Per-session profile files are validated and named by session role. CPU defaults remain unchanged.
- 2026-10-17: Locked the GPU group to `onnx-asr[gpu,hub]==0.12.0` and `onnxruntime-gpu==1.27.0`, mutually exclusive with the default CPU group. The GPU wheel's CUDA 13/cuDNN 9 system libraries are supplied by Colab and are not locked by uv. Notebook preflight checks NVIDIA driver major >=580, ORT DLL diagnostics, and CUDA provider availability; actual session creation precedes audio download. The available local evidence does not establish Colab image compatibility.
- 2026-10-17: Verified locally with `pytest tests/test_processing.py -q` (5 passed, mocked model/runtime boundary), `ruff check .`, `ruff format --check .`, and `python scripts/check_workspace.py`. All notebook code cells compile and the workspace checker confirms no saved execution state. No real audio/model inference, Drive transfer, new-session resume, or Colab GPU profile was performed. The live-runtime acceptance criteria therefore remain unchecked and this ticket stays claimed.
- 2026-10-17: After merging integration through `6c8431f` (`f8e59a5`), reran the full Python fixture suite: `pytest tests -q` (67 passed), `ruff check .`, `ruff format --check .`, `uv lock --check --offline`, `python scripts/check_workspace.py`, and `git diff --check`; all passed. Criteria 1 and 7 are implemented and checked. Criteria 2-6 remain unmet because no Colab runtime, Drive, GPU, audio/model run, or new-session proof was available.
