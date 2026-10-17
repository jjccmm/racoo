# 02: Transcribe one real Folge on Windows CPU

**What to build:** An operator can supply an identified audio source to the existing CLI and obtain a validated transcript with correct episode-relative times on Windows CPU.

**Blocked by:** None (can start immediately).

**Status:** resolved

**Spec coverage:** User stories 37, 38, 39, 49, 52 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public processing command to saved episode JSON and diagnostics; deterministic external-model/audio fixtures and a separately recorded real CPU run.

- [x] Pin Parakeet-TDT-0.6B-v3 model/export revisions and compatible onnx-asr CPU runtime dependencies for Python 3.12 without reopening model selection.
- [x] Accept explicitly supplied stable episode/source metadata; consume that identity rather than inventing a separate title- or URL-based identity algorithm.
- [x] Download with bounded timeout/retries, decode feed audio to supported model input, and preserve original audio checksum and duration.
- [x] Process multiple speech sections and pauses, establish the pinned recognizer's time reference, and convert native token points exactly once to absolute episode seconds.
- [x] Persist original recognized text, ordered uniquely identified segments, optional native token points, and complete model/export/runtime provenance through the existing semantic episode validator; synchronize the structural schema if extended.
- [x] Show known absolute-time outcomes and invalid-data rejection through the command boundary without internal helper/call-count tests.
- [x] Record difficult excerpts and at least one complete real Folge processed on Windows CPU, with actual provider and timing evidence. Environment detection or fake output alone cannot resolve the ticket.
- [x] Keep model/audio caches untracked and real recognition separate from ordinary offline checks.

Implementation and evidence are pending integration review; status remains claimed. [The CPU report](../../../docs/research/windows-cpu-asr-proof.md) records a complete 4343-second real episode, actual CPU providers, 797.015-second runtime, real excerpt/silence timing comparisons, and 41 passing Python checks. Independent listening and difficult-excerpt quality references remain the later pilot quality gate; no human gate is claimed by these runtime proofs. Export and selected upstream metadata revisions are immutable, but the exporter's exact upstream-commit linkage remains explicitly unattested. Colab GPU and hosted Windows/Linux CI remain separate outstanding integration evidence.

Merged the authoritative integration through `9876268`; the full frozen check exited 0 with 41 Python tests, both base-path builds, and 12 Chromium tests. The existing restricted-Windows preview teardown limitation required cleanup of only the independently verified ASR preview tree after all browser cases passed. Model/audio caches remain ignored. The completed transcript and versioned reports are committed for merger review.

## Comments

### 2026-10-17 — Integrated acceptance

Implementation `0bba597` and complete real CPU evidence `e9a1907` were integrated by merge `10ea882`. The subsequent analysis integration `7c1b1ac` preserves the public catalog/transcribe/analyze commands, pinned CPU dependencies, episode/schema updates, and FFmpeg fixture prerequisite. On that combined integration, `uv sync --locked --offline` passed and `uv run --frozen python scripts/check.py` exited 0: Ruff, all 44 Python tests, schema/documentation/notebook checks, root/project-prefix production builds, and all 15 root-path Chromium cases. The pinned dev-wheel FFmpeg 7.1 was on PATH; browser teardown completed with the required process permission. Pytest reported only an existing inaccessible local cache directory warning; all test assertions passed. No audio or model downloads occurred in these routine checks.

The complete real 4343-second CPU episode and the middle/end offset comparisons meet this ticket's runtime and timeline acceptance. The first excerpt's changed VAD segmentation remains inconclusive. Independent listening, human quality references, Colab GPU, hosted CI, and exporter-attested upstream linkage remain explicitly unclaimed in the CPU report and belong to their separate follow-up evidence. Ticket 02 is resolved for the implemented Windows CPU slice.
