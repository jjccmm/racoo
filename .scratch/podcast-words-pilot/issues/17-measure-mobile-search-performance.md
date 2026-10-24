# 17: Measure the real pilot on a mobile profile

**What to build:** An operator can reproduce measured cold/warm search behavior and initial transfer size for the actual pilot on a documented mobile profile.

**Blocked by:** 14: Use the complete static site at root and project prefix; 15: Produce the five real pilot episodes and publication.

**Status:** wontfix

**Spec coverage:** User stories 30, 53, 54 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Actual built-site browser measurements, request byte totals and memory observations tied to the real publication and a recorded device/network/cache profile.

- [ ] Record the browser/device or emulation, viewport, CPU conditions, bandwidth/latency, query set, cache state, and precise timing start/end.
- [ ] Measure the first usable results with required context against the five-second target and subsequent searches against the one-second target.
- [ ] Measure transfers through the first results against the 10 MB budget, accounting for relevant startup/prewarming traffic rather than hiding it before measurement.
- [ ] Observe lazy detail loading and confirm neither startup nor global coverage fetches the entire transcript corpus; record browser memory observations without inventing an unagreed memory threshold.
- [ ] Tie the report to the real five-episode publication and distinguish a measured pass/fail from an unavailable browser or unexecuted benchmark.
- [ ] Keep failed targets explicit for correction and rerun; do not claim the small pilot proves full-archive performance.

Scope superseded by the operator: the current [local pilot spec](../../local-five-episode-pilot/spec.md) replaces exact-audio/timestamp gates and covers real processing, technical browser/mobile checks and readiness reporting. Historical evidence above remains; independent human search review is not claimed and archive approval remains separate. This ticket closes without asserting that the old acceptance criteria were met.
