# 16: Review the pilot's search and timestamp accuracy

**What to build:** A reviewer can establish whether the real pilot meets the agreed remembered-passage and timestamp gates, with an explicit result for every reference.

**Blocked by:** 14: Use the complete static site at root and project prefix; 15: Produce the five real pilot episodes and publication.

**Status:** ready-for-human

**Spec coverage:** User stories 50, 51, 52, 54 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Human-reviewed built-site searches and reference-time comparisons against the exact transcribed audio, with a saved scored report tied to the current publication.

**Human involvement:** Final passage/recognition review requires human judgment. An agent can prepare and score evidence but cannot invent the completed review.

- [ ] Run all ten independently reviewed keyword queries against the real built pilot and record the expected episode, observed result rank and review outcome.
- [ ] Require at least nine of ten queries to find the correct episode among the first five results.
- [ ] Check the fifteen reviewed beginning/middle/end passage references against the exact transcribed audio; each mapped time must be within five seconds.
- [ ] Evaluate mapped passage time separately from the player's deliberate lead-in and distinguish changed ad-inserted audio from the originally transcribed version.
- [ ] Record manual review and each measurement/result against the source/reference and publication identities; synthetic results or unreviewed recognizer-derived expectations cannot pass.
- [ ] Explain that the five-episode top-five gate checks recall, while the larger controlled browser corpus verifies ranking and later archive-scale qualification remains separate.
- [ ] Leave unresolved references, failed thresholds, or missing real runtime evidence explicit and withhold a passing gate rather than labeling the pilot complete.
