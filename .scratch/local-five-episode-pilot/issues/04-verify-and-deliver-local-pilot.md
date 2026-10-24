# 04: Verify and deliver the local five-episode pilot

**What to build:** The operator can open a locally running site containing exactly five processed episodes, use remembered-word search and word statistics, and see the measured processing times, with a clean committed repository.

**Blocked by:** 03: Process and publish the five real episodes locally.

**Status:** ready-for-agent

- [ ] Run the complete fixture-only checks and real-pilot browser smoke checks at the relevant base paths; verify no audio matching or word timestamps remain in active output.
- [ ] Check real search queries, five-episode statistics, displayed durations/timings, ordinary playback actions and the nearby advertising/coarse-time warning.
- [ ] Record real pipeline timings and normalization, JSON size/segment counts, audio cleanup and resume observations; distinguish technical checks from independent human accuracy review.
- [ ] Review standards and spec against the committed baseline in separate subagents and fix consequential findings.
- [ ] Update current plan/operation docs and retire superseded exact-audio/exact-time pilot requirements without claiming full-archive approval.
- [ ] Commit all delivered work, leave git status clean, remove implementation worktrees safely and start the actual five-episode local website for the operator.
