# Word explorer: separate review axes

Baseline: `37685586d36d099463fb46218d1dfcff3b2fcaad`. Initial reviewed implementation: `3a158a53edcd25622c8e724497842498124655ae`. Diff: `git diff 3768558...3a158a5`. Independent read-only agents reviewed Standards and Spec; one implementer fixed both findings in `9a91ab1`, integrated in `0e6670b`.

## Standards

No documented-standard breaches found.

One nonblocking heuristic finding:

- Possible Duplicated Code (P3): Frequency and Player duplicated the same minute/second timestamp formatter. Export one shared formatter so passage buttons and the player retain identical formatting when it changes.

The standalone search/session entry is consistent with the documented preservation of native API probes; it does not retain an obsolete production UI.

**Resolution:** Both consumers now use the shared playback formatter. Existing public passage/player checks pass. Standards: 0 hard violations, 1 heuristic finding, 0 open.

## Spec

- P2: A delayed shared-link load can overwrite newer playback. The initial loadEpisode response replaces player and timestamp, but choose did not abort it. Opening shared episode A, selecting/playing B and then releasing A could replace B while the URL still identified B. Abort/invalidate the pending request when choosing another passage and cover this race.

No other concrete missing requirements, scope creep, or incorrect implementation found.

**Resolution:** A public built-browser tracer reproduced the race before the fix. Choosing a passage cancels the obsolete direct-link request and clears its pending state; releasing A retains B and the correct URL. The regression and complete final checks pass. Spec: 1 finding (P2), 0 open.

Summary: Standards 0 hard/1 minor heuristic finding (fixed); Spec 1 P2 finding (fixed). No open findings on either axis.
