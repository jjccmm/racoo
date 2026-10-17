# 19: Explain UFO537 Colab GPU and Windows CPU runtime difference

**What to build:** An operator can measure the shared transcription workflow by stage on Windows CPU and Colab GPU, reproduce a comparable UFO537 run, and understand from recorded evidence why the reported Colab run took longer before deciding whether an optimization is justified.

**Blocked by:** None (can start immediately). The completed CPU proof in ticket 02 supplies baseline evidence; this investigation can contribute runtime evidence to ticket 10 without waiting for that ticket's full Drive/resume acceptance.

**Status:** ready-for-human

**Related:** 02: Transcribe one real Folge on Windows CPU; 10: Resume the shared workflow on Colab GPU and Drive.

**Verification:** The public processing workflow and notebook orchestration, saved machine-readable stage measurements and actual ONNX execution profiles, and a reproducible comparison report. Small controlled external inputs verify timing/report behavior offline; they do not establish real GPU performance.

**Human involvement:** The operator must provide access to the Colab runtime or start the measurement runs and return their reports. Instrumentation and offline checks can proceed independently; this ticket cannot be resolved solely from fixtures or the reported wall-clock duration.

## Known observations

- The operator reports approximately 36 minutes for the entire Colab processing/checkpoint cell for UFO537 Festival. It starts while the cell copies the Drive catalog into the VM and includes audio/model lookup or downloads (cache state unknown), profiling and Drive checkpoint copies; dependency setup in the earlier bootstrap cell is excluded. Individual stage timings were not recorded.
- The operator-supplied report proves execution on a Tesla T4 with both CUDA and CPU model nodes. Its per-session counts and runtime facts are summarized in `docs/research/evidence/colab-gpu-ufo537-2026-10-17.json`. Three raw ORT profile files were reported as roughly 700 MB each on Drive; they are not present in this workspace for duration or transfer analysis.
- The recorded Windows CPU run took 797.015 seconds (13 minutes 17 seconds) for 4343.222875 seconds of decoded audio. Audio and model weights were already cached; the measured command included model-session construction and decoding. Other checks and excerpt experiments were running concurrently, so this is not an isolated benchmark.
- A new unprofiled CPU baseline completed on commit `080cc243bc471a28a17c22d1ecb71ab5a43f9163`: 582.125 seconds total, of which the recognizer-generator iteration was 566.922 seconds (97.4%). That boundary includes VAD/preprocessing and result assembly. Exact audio hash, warm model/VAD cache state and runtime facts are recorded in `docs/research/evidence/windows-cpu-ufo537-runtime-080cc243.json`; profile-off means no CPU ORT-node duration attribution was collected.
- The earlier notebook bootstrap error was caused by the wrong repository branch on the Colab server and has been identified separately from this performance question.

## Acceptance criteria

- [ ] Identify the exact input audio by stable episode identity, SHA-256 and decoded duration. Use matching audio bytes, model/export revisions, quantization, VAD and recognition settings for the comparison; record the repository commit and any unavoidable differences rather than silently comparing different runs.
- [ ] Record the allocated GPU model, host CPU/resources, NVIDIA driver, CUDA/cuDNN facts, Python and package versions, execution-provider configuration and relevant threading/batch settings for each measured environment.
- [ ] Separately measure environment/dependency setup, episode-audio download, model-parameter/VAD download, model/session initialization, audio decoding, inference, result validation/serialization, profile finalization/analysis and Drive transfers. Where practical distinguish preprocessing/VAD, encoder and decoder inference. Identify cache hits, downloaded bytes and unavailable measurements explicitly.
- [ ] Define start/end boundaries and units for every stage using elapsed-time measurement, report the overall wall-clock total, and explain nesting, overlap and unattributed time so the breakdown does not double-count work or silently omit setup/transfers.
- [ ] Establish actual CUDA execution and CPU fallback from executed-node evidence, including attribution and time where available for encoder, decoder and VAD. Provider availability, configured providers and GPU utilization alone must not be treated as proof of where inference ran. Inspect device-transfer or synchronization costs when the profiles indicate they matter.
- [ ] Capture cold-start/cache-miss behavior and repeat with warm audio/model caches on the compared runtimes. State exactly which caches are warm, the repeat count and observed variability. Every timed inference run must actually transcribe the episode, rather than report the fast path that skips an existing completed result.
- [ ] Evaluate profiling overhead separately with a controlled comparison, preserving a profiled run as execution evidence. Distinguish profiler overhead during inference from profile parsing, file sizes and Drive upload time; keep unmeasured contributions explicitly unknown.
- [ ] Produce a reproducible stage-by-stage CPU/GPU comparison, including warm inference time, end-to-end time, audio duration and consistently defined speed ratios. Account for the original approximately 36-minute observation or state precisely what prevents reproducing or explaining it and what additional measurement is required.
- [ ] Document the measured dominant bottleneck and supporting timing/profile evidence before proposing an optimization. Each proposal must explain its expected effect and evidence; implementing optimizations is separate follow-up work, and an explanation must not assume that GPU execution is necessarily faster.
- [x] Preserve existing accepted transcripts and provenance, keep heavy audio/models/raw traces outside versioned source, and version concise measurement summaries and conclusions. Routine checks remain fixture-only, without live downloads, model inference or GPU access. This investigation does not replace ticket 10's remaining runtime/resume gates or the pilot's quality and mobile-performance acceptance.

## Scope

Deliver measurement support, real-run evidence and an explanation. Retain the selected ASR model and existing public workflow. Bulk archive processing, paid infrastructure and speculative performance changes are outside this ticket.

## Comments

2026-10-17: Created from the operator's approved request for one investigation ticket. The reported GPU duration is an observation to explain, not a verified like-for-like benchmark or an established root cause. Publication of this ticket does not start live processing or change any parent acceptance state.

2026-10-17: The operator supplied a completed Colab report for UFO537 Festival. It proves executed CUDA and CPU model nodes on a Tesla T4, but contains no elapsed stage timings, audio checksum or repository commit. The original roughly 36-minute boundary is now known to be the entire processing/checkpoint cell: it includes catalog copying, cold audio/model work, inference profiling and Drive copies, while excluding the earlier uv setup. The operator reports three raw profile files of approximately 700 MB each on Drive; the files were not supplied locally. The unmodified report is identified by SHA-256 in `docs/research/evidence/colab-gpu-ufo537-2026-10-17.json`.

2026-10-17: Added per-stage measurements to the shared CLI, explicit profile-on/off selection, and a single-episode `--audio-file` input for exact-byte forced reruns. Added a separate Colab benchmark cell for a cold run and warm profile-on/off repeats. Fixture tests confirm forced reprocessing, profile-off evidence labeling, profile-on node summaries, and rejection of one audio file assigned to multiple episode IDs. Comparable CPU/GPU timing and bottleneck diagnosis remain open.

2026-10-17: Added an unprofiled Windows CPU run on the same exact audio hash as the earlier Windows proof. The measured recognizer-generator boundary dominates that CPU run, but it is not a pure encoder/kernel measurement and does not explain the Colab whole-cell duration. The original Drive profiles should be summarized in-place first; the historical GPU run still has no stage elapsed times, audio hash or code commit. Ticket 19 remains open pending comparable GPU timings and a GPU/profile bottleneck diagnosis.

2026-10-17: Integrated measurement support and evidence at `1507d1f`, with the single-sample reporting clarification integrated at `4b51b45`. MAIN passed all 80 Python tests, Ruff lint/format and the workspace checker; notebook syntax/links were checked again after the notebook-only follow-up. Standards review found no consequential issue. Spec review's one finding is fixed: each warm profiling mode explicitly records n=1 and variability as unmeasured. See the [review record](../interim-review.md). Accepted transcript, historical 797.015-second proof and operator report hashes remain unchanged. The new CPU run's three raw artifacts were copied and hash-verified under `.cache/ticket19/cpu-baseline-080cc243/` before worktree cleanup.

2026-10-17: Handoff to the operator: use the updated notebook's **Bereits gespeicherte ORT-Profile auswerten** cell first. It summarizes the existing three Drive traces and extracts audio/model provenance from the saved episode, without another inference run or downloading the raw traces locally. Return the resulting compact `reports/ep-5764a1149f18a8f68698fb45bb405264-profile-evidence.json`; then perform only the missing controlled timing runs. The original GPU cache state is unknown (the earlier comment's description as cold was not established). Profiling overhead, Drive duration, matched GPU timings and the GPU bottleneck remain unmeasured, so ticket 19 is `ready-for-human`, not resolved. Other pilot gates are unchanged.
