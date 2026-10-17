# 12: Rebuild one coherent static publication

**What to build:** An operator can build a consistent catalog/transcript/statistics/search publication from completed inputs and refresh only the stages whose consumed data changed.

**Blocked by:** 04: Rank remembered Stichwörter with lazy result details; 08: Inspect Gesamtwörter and vocabulary growth; 09: Resume selected episode processing without losing work.

**Status:** claimed

**Spec coverage:** User stories 29, 32, 44, 45, 46, 47, 49 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public publication/build commands to complete saved artifacts and the built site's handling of publication identity or fetch failures.

- [x] Generate catalog, vocabulary, aggregate/episode statistics, count shards, transcripts, real Pagefind index, and search-ID metadata mapping with one identifiable publication state.
- [x] Reuse the already demonstrated search and analysis producers; public consumers must use the matching index-bound metadata rather than cross-build search IDs.
- [x] Reject incomplete or mismatched input/publication combinations and make incompatible/missing public data an explicit error, not zero data or a reload loop.
- [x] Rebuild affected analysis/publication outputs after a consumed transcript change and analysis-derived outputs after an analysis-version change without implicit retranscription.
- [x] Preserve recognized text/times during metadata changes and reject silently mixed incompatible pilot processing configurations.
- [x] Export only intended public data, keep heavy caches/checkpoints and generated builds untracked, warn above the agreed 800 MB artifact budget and reject above 1 GB.
- [x] Show pilot dataset identity/state rather than archive-completeness claims and demonstrate unchanged rebuild, targeted invalidation, mixed-state rejection, and build-budget handling with small public-command fixtures.

**Evidence:** `tests/test_publication.py` exercises the public CLI for cached reuse, targeted transcript invalidation, analysis-version invalidation, metadata reconciliation with stable text/times, persisted and derived revisions, incomplete selections, and mixed/foreign inputs. Browser checks cover common publication IDs and a one-shot mismatch error. A local selected-fixture CLI-to-Vite build reused its saved analysis; a title/date-only catalog refresh changed both the Pagefind index ID and publication ID while preserving transcript text/times and reusing analysis. Lowered test-only size limits exercised warning and hard rejection, and an attempted increase above the fixed maximum was rejected; production defaults are decimal 800,000,000 and 1,000,000,000 bytes.
