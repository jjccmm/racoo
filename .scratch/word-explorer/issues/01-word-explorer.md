# 01: Explore episode word counts and passages through one search field

**What to build:** A visitor selects remembered words in one autocomplete, compares their absolute stacked episode counts in a prominent chart, switches between top-ten and chronological views, and reads highlighted passages with per-word counts and playback in the ten best episodes.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] One keyboard/touch-accessible dropdown field with ten suggestions, five selected-word chips directly below it, click-to-remove and consistent colors.
- [x] Dominant stacked count chart with visible episode X axis; Top 10 sums/ranks selected counts, Alle preserves chronological zero episodes; no normalized option.
- [x] Ten ranked episode cards retain exact per-word/total counts and show lazy original passages with safe wordform-aware colored highlighting and expandable context.
- [x] Preserve shared player, coarse jump/ad hint, direct links, manual retries and stale-response protection; metadata remains available below the main view.
- [x] Preserve publication validation, compact shards/stopword policy and no eager corpus loading; update meaningful built-browser tests at both bases without hidden legacy UI.
- [x] Pass targeted checks, final full fixture suite, real-five desktop/mobile checks and separate Standards/Spec review; commit, integrate and document completion.

## Comments

User explicitly authorized ticket creation and implementation. One complete vertical slice; existing public CLI and built-browser seams are already agreed. Assigned to word-explorer implementer; coordinator owns final evidence, plan, tracker and integration. See parent spec for exact ordering, defaults, and boundaries.

Implemented in dcfc3fa, integrated in 3a158a5; both review findings fixed in 9a91ab1 and integrated in 0e6670b. Two browser tracers were red before implementation; exact count/rank/highlight/scoped-load checks pass. Final check: 76 Python cases, 62 Chromium cases per base, lint/types/docs/contracts. Real-five root/project checks include literal hund/geld values, zero rows, removable chips, native surface highlights, mobile bounds and lemma-total metadata safety. See [completion](../../../docs/pilot/word-explorer.md), [review](../review.md) and their saved evidence. Source data/contracts/dependencies unchanged; temporary worktree removed and actual root pilot rebuilt.
