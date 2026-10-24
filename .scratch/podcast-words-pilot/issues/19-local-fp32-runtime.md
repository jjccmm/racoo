# 19: Local FP32 runtime and audio-version correctness

**Status:** resolved

**Blocked by:** None.

The user selected local GPU FP32 exclusively, accepted the complete UFO537 transcript quality and approved about 25× real time as the planning value on 2026-10-24.

- [x] Record CPU/GPU and precision comparisons with input/cache/timing limits in [the investigation](../../../docs/research/asr-investigation.md).
- [x] Complete a full local FP32 episode and preserve original text plus exact reference audio.
- [x] Promote the tested CUDA-11 runtime to the normal CLI and remove remote/INT8/import/comparison executable paths.
- [x] Reproduce the different public audio, retain input versions by content hash, and test playback mismatch/file verification.
- [x] Validate the simplified production CLI with a real GPU excerpt and routine Python/browser checks.

The [historical worklog](../../../docs/research/history/asr-runtime-worklog.md) preserves earlier experiments and superseded criteria. This decision does not close the five-episode search, timestamp-reference or mobile gates.
