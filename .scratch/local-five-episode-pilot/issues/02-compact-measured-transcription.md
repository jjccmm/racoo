# 02: Compact measured transcription with temporary audio

**What to build:** A local GPU run downloads one episode, saves a compact transcript and processing times, removes the audio, and resumes later from the transcript without checking the remote MP3.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Produce schema-v2 episodes with text/start/end coarse segments of about five minutes and no token/word timing arrays or audio identity hash.
- [x] Preserve all recognized text in order and keep the transcript suitable for existing lemma counts and segment-based Pagefind search.
- [x] Remove retained audio references, later remote matching and obsolete fine-timing experiments; keep audio temporary on success and failure.
- [x] Persist actual download_seconds, transcription_seconds and total_seconds, report shared model setup separately, and print total/audio duration plus download/transcription seconds per audio minute on every completed episode.
- [x] Keep resume durable and avoid downloads/inference for already completed valid results.
- [x] Update structural schema, active fixtures, text/configuration provenance and compact statistics metadata together; tests use the public CLI/artifact seam without live model downloads.
- [x] Keep the pinned local FP32 GPU path and validate changed timing/cleanup behavior with focused red-green tests.
- [x] Commit the implementation and integrate the current integration tip before completion.

## Assignment

Claimed for an isolated implementer worktree; coordinator owns authoritative status and integration.

## Integration evidence

Merged into `codex/local-five-episode-pilot` as `c08aac2`. 42 focused Python checks, schema export, cleanup/resume and Ruff passed; full suite being reconfirmed after integration.
