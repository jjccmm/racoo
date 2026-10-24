# Five-episode pilot tickets

Current work is tracked in [the local five-episode pilot](../local-five-episode-pilot/ticket-index.md). The operator replaced the exact-audio/timestamp gates; historical tickets below retain their evidence and comments.

The [parent spec](spec.md) defines the confirmed behavior and test boundaries. This index provides navigation; each individual ticket's current Status and Blocked by fields govern execution.

1. [01: Inspect and reconcile the episode catalog](issues/01-catalog-and-stable-sources.md)
2. [02: Transcribe one real Folge on Windows CPU](issues/02-windows-cpu-transcription.md)
3. [03: Find a known passage using a real Pagefind index](issues/03-real-pagefind-passage-search.md)
4. [04: Rank remembered Stichwörter with lazy result details](issues/04-multiword-coverage-and-lazy-results.md)
5. [05: Explore, play, and share every Fundstelle](issues/05-explore-play-and-share-passages.md)
6. [06: Generate and inspect exact Grundform counts](issues/06-exact-lemma-statistics.md)
7. [07: Compare Grundformen across episode lengths](issues/07-compare-lemma-frequency-trends.md)
8. [08: Inspect Gesamtwörter and vocabulary growth](issues/08-chronological-vocabulary-statistics.md)
9. [09: Resume selected episode processing without losing work](issues/09-resumable-selected-episode-processing.md)
10. [10: Retired remote runtime (history)](../../docs/research/history/retired-remote-workflows.md)
11. [11: Retired result transfer (history)](../../docs/research/history/retired-remote-workflows.md)
12. [12: Rebuild one coherent static publication](issues/12-coherent-static-publication.md)
13. [13: Select pilot Folgen and independent passage references](issues/13-pilot-inputs-and-independent-references.md)
14. [14: Use the complete static site at root and project prefix](issues/14-integrated-static-site-and-ci.md)
15. [15: Produce the five real pilot episodes and publication](issues/15-produce-five-real-pilot-episodes.md)
16. [16: Review the pilot's search and timestamp accuracy](issues/16-review-passage-quality-gates.md)
17. [17: Measure the real pilot on a mobile profile](issues/17-measure-mobile-search-performance.md)
18. [18: Report pilot readiness without bypassing its gates](issues/18-pilot-readiness-report.md)
19. [19: Local FP32 runtime and audio-version correctness](issues/19-local-fp32-runtime.md)

Start only ready-for-agent work whose blockers are resolved. Keep human review and real runtime evidence explicit; a prepared procedure or fixture result does not satisfy an unperformed live check.

Prepare a committed repository baseline before branch/worktree implementation. Ticket publication does not start implementation or close the parent spec.
