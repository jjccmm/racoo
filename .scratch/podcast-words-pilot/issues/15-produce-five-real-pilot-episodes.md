# 15: Produce the five real pilot episodes and publication

**What to build:** The selected real five-episode corpus is processed locally with FP32/GPU, analyzed, and built as one traceable pilot publication.

**Blocked by:** 12: Rebuild one coherent static publication; 13: Select pilot Folgen and independent passage references. The local FP32 runtime is confirmed by the 2026-10-24 investigation; former tickets 10 and 11 are retired.

**Status:** wontfix

**Spec coverage:** User stories 36, 37, 38, 39, 40, 41, 42, 43, 45, 46, 47, 52 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Actual local processing/build commands, real normalized results, durable resume, and recorded audio/runtime/publication provenance.

**Human involvement:** Independent listening and pilot reference checks. Actual processing is local; fixture results do not substitute for real five-episode evidence.

- [ ] Process exactly the reviewed five-episode selection with the agreed fixed Parakeet model/export configuration; reuse prior compatible validated results where possible instead of retranscribing needlessly.
- [ ] Retain complete source/audio/model/export/runtime provenance, original text, valid absolute segment/token times, and unique segment identities for every real result.
- [ ] Use the proven local Windows FP32/GPU configuration and record full-episode runtime reports, with approximately 25× real time as the planning value.
- [ ] Demonstrate durable local completion/resume and retain each exact transcribed audio version by content hash for reference checks.
- [ ] Run pinned real spaCy analysis and build one matching publication from the five completed episodes, including the search index and its metadata mapping.
- [ ] Keep incomplete episodes, conflicting data, runtime gaps, or missing reference inputs explicit; none counts as a completed five-episode corpus.
- [ ] Save a concise reproducible evidence record tied to selected audio identities, configuration and publication state, while leaving audio, model weights and generated builds untracked. Do not start the full archive.

Scope superseded by the operator: the current [local pilot spec](../../local-five-episode-pilot/spec.md) replaces exact-audio/timestamp gates and covers real processing, technical browser/mobile checks and readiness reporting. Historical evidence above remains; independent human search review is not claimed and archive approval remains separate. This ticket closes without asserting that the old acceptance criteria were met.
