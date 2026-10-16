# 02: Transcribe one real Folge on Windows CPU

**What to build:** An operator can supply an identified audio source to the existing CLI and obtain a validated transcript with correct episode-relative times on Windows CPU.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Spec coverage:** User stories 37, 38, 39, 49, 52 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public processing command to saved episode JSON and diagnostics; deterministic external-model/audio fixtures and a separately recorded real CPU run.

- [ ] Pin Parakeet-TDT-0.6B-v3 model/export revisions and compatible onnx-asr CPU runtime dependencies for Python 3.12 without reopening model selection.
- [ ] Accept explicitly supplied stable episode/source metadata; consume that identity rather than inventing a separate title- or URL-based identity algorithm.
- [ ] Download with bounded timeout/retries, decode feed audio to supported model input, and preserve original audio checksum and duration.
- [ ] Process multiple speech sections and pauses, establish the pinned recognizer's time reference, and convert native token points exactly once to absolute episode seconds.
- [ ] Persist original recognized text, ordered uniquely identified segments, optional native token points, and complete model/export/runtime provenance through the existing semantic episode validator; synchronize the structural schema if extended.
- [ ] Show known absolute-time outcomes and invalid-data rejection through the command boundary without internal helper/call-count tests.
- [ ] Record difficult excerpts and at least one complete real Folge processed on Windows CPU, with actual provider and timing evidence. Environment detection or fake output alone cannot resolve the ticket.
- [ ] Keep model/audio caches untracked and real recognition separate from ordinary offline checks.
