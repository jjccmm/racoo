# 18: Report pilot readiness without bypassing its gates

**What to build:** An operator can inspect one reproducible pilot-readiness result showing whether the exact publication has all required runtime, behavior, quality, and performance evidence.

**Blocked by:** 16: Review the pilot's search and timestamp accuracy; 17: Measure the real pilot on a mobile profile.

**Status:** wontfix

**Spec coverage:** User stories 29, 46, 48, 50, 51, 52, 53, 54 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public acceptance/report command through saved evidence and diagnostics, with known pass, missing-evidence, stale-state, and failed-gate examples.

- [ ] Aggregate the selected five inputs, compatible real runtime/checkpoint/import evidence, coherent publication, root/project-prefix behavior checks, manual quality results and mobile measurements by their actual input/publication identities.
- [ ] Report pass only when all required evidence exists and the agreed 9/10, fifteen five-second timestamp, cold/warm search and transfer gates pass.
- [ ] Reject missing manual review, missing local FP32/GPU runtime proof, stale evidence from another input/publication state, failed checks or incomplete episodes with clear unmet-gate diagnostics.
- [ ] Add a focused fixture-based regression at the confirmed public processing/acceptance boundary, using independently authored expected pass/fail evidence rather than recomputing the report's own decision as its assertion.
- [ ] Produce a human-readable readiness record that a later archive-processing task can consult; do not automatically launch archive transcription, create a remote, or publish the site.
- [ ] Record remaining integration-review findings and retain an incomplete readiness result until they are addressed. Ticket/spec resolution follows actual integrated work and review, not presence of this report's scaffolding.

Scope superseded by the operator: the current [local pilot spec](../../local-five-episode-pilot/spec.md) replaces exact-audio/timestamp gates and covers real processing, technical browser/mobile checks and readiness reporting. Historical evidence above remains; independent human search review is not claimed and archive approval remains separate. This ticket closes without asserting that the old acceptance criteria were met.
