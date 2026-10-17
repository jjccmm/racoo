# 19: Explain UFO537 Colab GPU and Windows CPU runtime difference

**What to build:** An operator can measure the shared transcription workflow by stage on Windows CPU and Colab GPU, reproduce a comparable UFO537 run, and understand from recorded evidence why the reported Colab run took longer before deciding whether an optimization is justified.

**Blocked by:** None (can start immediately). The completed CPU proof in ticket 02 supplies baseline evidence; this investigation can contribute runtime evidence to ticket 10 without waiting for that ticket's full Drive/resume acceptance.

**Status:** ready-for-agent

**Related:** 02: Transcribe one real Folge on Windows CPU; 10: Resume the shared workflow on Colab GPU and Drive.

**Verification:** The public processing workflow and notebook orchestration, saved machine-readable stage measurements and actual ONNX execution profiles, and a reproducible comparison report. Small controlled external inputs verify timing/report behavior offline; they do not establish real GPU performance.

**Human involvement:** The operator must provide access to the Colab runtime or start the measurement runs and return their reports. Instrumentation and offline checks can proceed independently; this ticket cannot be resolved solely from fixtures or the reported wall-clock duration.

## Known observations

- The operator reports approximately 36 minutes on Colab GPU for UFO537 Festival. Its timing boundaries, cache state, GPU allocation and executed-provider evidence have not yet been supplied.
- The recorded Windows CPU run took 797.015 seconds (13 minutes 17 seconds) for 4343.222875 seconds of decoded audio. Audio and model weights were already cached; the measured command included model-session construction and decoding. Other checks and excerpt experiments were running concurrently, so this is not an isolated benchmark.
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
- [ ] Preserve existing accepted transcripts and provenance, keep heavy audio/models/raw traces outside versioned source, and version concise measurement summaries and conclusions. Routine checks remain fixture-only, without live downloads, model inference or GPU access. This investigation does not replace ticket 10's remaining runtime/resume gates or the pilot's quality and mobile-performance acceptance.

## Scope

Deliver measurement support, real-run evidence and an explanation. Retain the selected ASR model and existing public workflow. Bulk archive processing, paid infrastructure and speculative performance changes are outside this ticket.

## Comments

2026-10-17: Created from the operator's approved request for one investigation ticket. The reported GPU duration is an observation to explain, not a verified like-for-like benchmark or an established root cause. Publication of this ticket does not start live processing or change any parent acceptance state.
