# 02: Exclude stopwords and a maintained additional lemma list

**What to build:** Frequency comparisons offer meaningful words only. Automatic stopwords and a simple editable extra list are omitted from published frequency data, and the website explains the exclusion and unchanged overall word metrics.

**Blocked by:** 01: Compact episode/count pairs throughout the published comparison.

**Status:** resolved

- [x] Filter spaCy stopword lemmas consistently across the whole publication from vocabulary AND all count files.
- [x] Provide a tracked, documented UTF-8 ignored-lemma list seeded with observed fillers, automatically used by every publishing route and overridable through the CLI.
- [x] Normalize/validate the list, include the effective policy in the statistics identity, and prove list changes rebuild cache-only without changing stored analyses or transcripts.
- [x] Preserve total/distinct/new-word summaries, all-word normalization and Pagefind search; remove the stopword toggle and show the required explanatory notice near the selection.
- [x] Pass targeted CLI/browser checks, real cache-only five-episode publication, full fixture checks and separate Standards/Spec review; record integrated commit evidence.

## Comments

See the specification for exact normalization, errors and metric boundaries. Alphabetical word files and frequency-sorted count shards must remain deferred documentation options. Coordinator handles final integration evidence and shared planning/domain docs.

Assigned to filtered-statistics implementer after ticket01 integration.

Implemented in 1bc1758 and merged by the merger in 46fc61e. Red-to-green CLI and browser evidence; 24 focused Python/build cases and 20 focused browser cases per base passed. Final combined check: 76 Python cases, 49 browser cases per base, lint/types/docs/contracts passed. Real-five root/project verification compares all 7,304 published pairs, unchanged full summary, exclusion notice and ten search regressions per base. Separate Standards/Spec reviews returned zero findings. See [completion report](../../../docs/pilot/compact-filtered-statistics.md) and [review](../review.md). Source episodes/analyses unchanged; final documentation/closure commit records worktree cleanup and root-build restoration.
