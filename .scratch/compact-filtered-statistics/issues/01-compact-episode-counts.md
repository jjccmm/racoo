# 01: Compact episode/count pairs throughout the published comparison

**What to build:** The operator publishes much smaller frequency files and can use the same episode comparisons, chart and top-ten results on the website. Stable episode identities remain available through the publication catalog.

**Blocked by:** None (can start immediately).

**Status:** claimed

- [ ] Publish numeric episode-index/count pairs under public statistics schema v2, with deterministic chronological catalog mapping and stable IDs retained in the catalog.
- [ ] Adapt all publishing/build/browser consumers together; preserve values above 255, absolute/normalized counts, zero rows and chronological tie handling.
- [ ] Fail visibly on old/mixed formats and invalid, duplicate or out-of-range count indices; a load error must not appear as zero.
- [ ] Demonstrate red-to-green CLI and built-browser checks at the agreed seams; update current contract documentation and merge the latest integration tip before reporting.

## Comments

Scope is the public statistics format. Source Episode/Analysis files and the existing 64 hash shards retain their roles. Coordinator owns PLAN, GLOSSARY, TASKS, deferred-option research and final integration evidence.

Assigned to compact-statistics implementer in an isolated worktree.
