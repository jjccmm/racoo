# 12: Rebuild one coherent static publication

**What to build:** An operator can build a consistent catalog/transcript/statistics/search publication from completed inputs and refresh only the stages whose consumed data changed.

**Blocked by:** 04: Rank remembered Stichwörter with lazy result details; 08: Inspect Gesamtwörter and vocabulary growth; 09: Resume selected episode processing without losing work.

**Status:** claimed

**Spec coverage:** User stories 29, 32, 44, 45, 46, 47, 49 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public publication/build commands to complete saved artifacts and the built site's handling of publication identity or fetch failures.

- [ ] Generate catalog, vocabulary, aggregate/episode statistics, count shards, transcripts, real Pagefind index, and search-ID metadata mapping with one identifiable publication state.
- [ ] Reuse the already demonstrated search and analysis producers; public consumers must use the matching index-bound metadata rather than cross-build search IDs.
- [ ] Reject incomplete or mismatched input/publication combinations and make incompatible/missing public data an explicit error, not zero data or a reload loop.
- [ ] Rebuild affected analysis/publication outputs after a consumed transcript change and analysis-derived outputs after an analysis-version change without implicit retranscription.
- [ ] Preserve recognized text/times during metadata changes and reject silently mixed incompatible pilot processing configurations.
- [ ] Export only intended public data, keep heavy caches/checkpoints and generated builds untracked, warn above the agreed 800 MB artifact budget and reject above 1 GB.
- [ ] Show pilot dataset identity/state rather than archive-completeness claims and demonstrate unchanged rebuild, targeted invalidation, mixed-state rejection, and build-budget handling with small public-command fixtures.
