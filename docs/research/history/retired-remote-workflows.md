# Retired remote workflows

Archived on 2026-10-24 after the user selected local GPU FP32 exclusively. These former requirements are historical, not active work.

# 10: Resume the shared workflow on Colab GPU and Drive

**What to build:** An operator can manually start the same processing workflow in Colab, persist each completed episode on Drive, and resume in a new session with a verified GPU provider.

**Blocked by:** 09: Resume selected episode processing without losing work.

**Status:** wontfix

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


## Superseded scope

2026-10-24: The user selected local GPU FP32 exclusively. This former workflow and its code were explicitly removed. The retained text below is historical evidence, not an active requirement. See [the investigation](../asr-investigation.md).

## Comments

- 2026-10-17: Added a thin Colab notebook that selects the mutually exclusive locked GPU dependency group, calls the shared `process` CLI per episode, keeps audio/models/profiles in VM storage, and checkpoints validated per-episode JSON plus run metadata to Drive before proceeding. It reuses valid Drive checkpoints in a new session and refuses to count provider availability alone as GPU proof. The optional difficult-excerpt workflow calls the shared `transcribe` CLI and stores offset-adjusted excerpt evidence separately from full episode results.
- 2026-10-17: Added provider selection and ONNX Runtime node-event profiling to the shared transcriber. Reports distinguish actual encoder/decoder/VAD session providers from executed model-node provider counts and identify mixed CPU fallback. Per-session profile files are validated and named by session role. CPU defaults remain unchanged.
- 2026-10-17: Locked the GPU group to `onnx-asr[gpu,hub]==0.12.0` and `onnxruntime-gpu==1.27.0`, mutually exclusive with the default CPU group. The GPU wheel's CUDA 13/cuDNN 9 system libraries are supplied by Colab and are not locked by uv. Notebook preflight checks NVIDIA driver major >=580, ORT DLL diagnostics, and CUDA provider availability; actual session creation precedes audio download. The available local evidence does not establish Colab image compatibility.
- 2026-10-17: Verified locally with `pytest tests/test_processing.py -q` (5 passed, mocked model/runtime boundary), `ruff check .`, `ruff format --check .`, and `python scripts/check_workspace.py`. All notebook code cells compile and the workspace checker confirms no saved execution state. No real audio/model inference, Drive transfer, new-session resume, or Colab GPU profile was performed. The live-runtime acceptance criteria therefore remain unchecked and this ticket stays claimed.
- 2026-10-17: After merging integration through `6c8431f` (`f8e59a5`), reran the full Python fixture suite: `pytest tests -q` (67 passed), `ruff check .`, `ruff format --check .`, `uv lock --check --offline`, `python scripts/check_workspace.py`, and `git diff --check`; all passed. Criteria 1 and 7 are implemented and checked. Criteria 2-6 remain unmet because no Colab runtime, Drive, GPU, audio/model run, or new-session proof was available.
- 2026-10-17: Integrated as no-ff merge `d0a77fb` on `integration/podcast-words-pilot`. The integrated fixture suite passed (`uv run --frozen --no-sync pytest tests -q --basetemp=.cache/pytest-ticket10`: 67 passed); Ruff lint and format checks, `uv lock --check --offline`, `scripts/check_workspace.py` (42 Markdown files and Colab cell syntax), and `git diff --check` also passed. A normal frozen `uv run` first attempted a Hatchling fetch and could not reach PyPI in this sandbox; verification used the existing project environment, with lock consistency checked offline. Criteria 1 and 7 are implemented. Criteria 2-6 remain open pending operator evidence from an actual Colab GPU/Drive run: runtime compatibility and executed provider, per-episode durable checkpoints, new-session resume, real full-episode and difficult-excerpt timing validation, and captured transfer/run steps. No GPU, model, or audio inference was performed here; this ticket is ready for that human runtime gate and is not resolved.

- 2026-10-17: The operator attempted bootstrap on a Colab kernel from VS Code. The supplied traceback reports `uv sync --locked --no-default-groups --group gpu --python 3.12` exiting with status 2, but contains no uv diagnostic output. The bootstrap cell now captures combined stdout/stderr and includes it in the setup exception. Local notebook syntax/workspace checks passed; the underlying setup failure awaits the actual uv output and is not yet diagnosed or counted as GPU runtime evidence.

- 2026-10-17: The operator identified the bootstrap error's cause as the wrong Git branch checked out on the Colab server. At the operator's request, the notebook's diagnostic-only change from `930f69b` was reverted; the original bootstrap command is restored. The operator also reports 36 minutes for the same episode that took 797.015 seconds locally on CPU with cached audio/models. That observation motivates a separate performance investigation; the Colab timing boundary, cache/setup costs and executed-provider/profile evidence have not yet been supplied, so the reported duration alone does not close the runtime or resume acceptance gates.


# 11: Import transferred results without silent conflicts

**What to build:** An operator can import completed episode results from another run, skip identical work, and receive explicit conflicts while preserving existing valid data.

**Blocked by:** 09: Resume selected episode processing without losing work.

**Status:** wontfix

**Spec coverage:** User stories 34, 38, 42, 43, 44 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public import/reconcile command, persisted episode/run state, exit status, and repeat import observations.

- [x] Validate every incoming episode's semantic contract, stable identity, aliases, audio/model provenance, and completion state before accepting it.
- [x] Skip identical existing results idempotently and report what was accepted or skipped.
- [x] Report differing existing transcript, audio, identity, or configuration data as a conflict without silent overwrite; preserve the existing validated result.
- [x] Keep verified catalog identity and metadata reconciliation separate from recognition replacement; a metadata change alone must not run ASR.
- [x] Expose relevant changed transcript/analysis inputs to downstream rebuilds without falsely retaining obsolete completion/publication state.
- [x] Verify valid import, repeat import, incomplete/invalid input, identity mismatch, conflicting output, and preserved previous data using public artifacts and diagnostics.
- [x] Do not require a live Colab session for deterministic import checks; the real cross-runtime transfer is evidenced with the later pilot run.

## Superseded scope

2026-10-24: The user selected local GPU FP32 exclusively. This former workflow and its code were explicitly removed. The retained text below is historical evidence, not an active requirement. See [the investigation](../asr-investigation.md).

## Comments

- Implemented the public `import-results` command. It validates each schema-v1 episode, required model/export/runtime provenance, non-empty completion, stable catalog identity and verified GUID aliases before durable acceptance. Existing invalid outputs and transcript/audio/identity/configuration conflicts remain unchanged; identical results skip, and metadata drift is reported separately.
- The command reports audio, configuration and transcript fingerprints for publication diagnostics. Complete legacy schema-v1 provenance with all optional 09 revision fields absent remains importable; partial or inconsistent revisions are rejected. No audio/model download or ASR call is part of import.
- Public CLI fixture coverage: acceptance, repeat import, verified alias, malformed/semantically invalid/incomplete inputs, unverified identity, metadata drift, transcript/audio/config conflicts, byte preservation and legacy provenance. Full Python suite: 57 passed. Ruff check/format and workspace documentation/Colab syntax checks passed. `uv run --frozen pytest` could not bootstrap the isolated worktree because PyPI access was denied; tests ran with the installed Python 3.12 environment and worktree `PYTHONPATH` instead.
- Integration acceptance: merged with no fast-forward as `4b392c9`. The full suite passed (57 tests), including import acceptance/repeat, alias, incomplete/invalid inputs, identity/audio/transcript/config conflicts, and byte preservation. Ruff check/format and workspace documentation/Colab syntax checks passed. A focused public CLI assertion also confirms accepted import preserves all runtime-version provenance in the stored episode.