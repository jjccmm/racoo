# 04: Verify and deliver the local five-episode pilot

**What to build:** The operator can open a locally running site containing exactly five processed episodes, use remembered-word search and word statistics, and see the measured processing times, with a clean committed repository.

**Blocked by:** 03: Process and publish the five real episodes locally.

**Status:** resolved

- [x] Run the complete fixture-only checks and real-pilot browser smoke checks at the relevant base paths; verify no audio matching or word timestamps remain in active output.
- [x] Check real search queries, five-episode statistics, displayed durations/timings, ordinary playback actions and the nearby advertising/coarse-time warning.
- [x] Record real pipeline timings and normalization, JSON size/segment counts, audio cleanup and resume observations; distinguish technical checks from independent human accuracy review.
- [x] Review standards and spec against the committed baseline in separate subagents and fix consequential findings.
- [x] Update current plan/operation docs and retire superseded exact-audio/exact-time pilot requirements without claiming full-archive approval.
- [x] Commit all delivered work, leave git status clean, remove implementation worktrees safely and start the actual five-episode local website for the operator.

## Assignment

Coordinator owns final fixture/real browser verification, documentation and delivery. Standards and spec reviews run in separate subagents against baseline `05885c9`.

## Completion evidence

- Full fixture check: 68 Python tests, Ruff, docs/validator, Web lint/typecheck and 37 Chromium tests at each root/project base.
- Real default root/project builds: exactly five episodes, coherent IDs; 10/10 transcript-derived queries per base put expected episode first, compact timing table, lemma counts, vocabulary, segment actions/ad hints and mobile overflow checks passed.
- GPU batch: 629.906 s including shared setup; 319,684 bytes of compact Episode JSON, 49,665 analyzed words. Resume skipped five, unchanged transcript bytes and empty audio directory.
- Separate Standards/Spec agents reviewed baseline05885c9→906ac80. Two standards findings fixed in4b5bcb5 and integrated92a9aa0; real model smoke red→green. No material spec findings. See docs/pilot/review.md.
- Mobile profile first search2.983 s, next2.495 s, repeated1.932 s with normal cache. The historical1s repeat target is not met; it is recorded as a limit, not a current local-function blocker or full-archive approval.
- All four implementation worktrees removed; real root preview reachable at127.0.0.1:4173. Current operation docs and evidence committed with this completion record; generated builds/models/audio are untracked.
