# 02: Exclude stopwords and a maintained additional lemma list

**What to build:** Frequency comparisons offer meaningful words only. Automatic stopwords and a simple editable extra list are omitted from published frequency data, and the website explains the exclusion and unchanged overall word metrics.

**Blocked by:** 01: Compact episode/count pairs throughout the published comparison.

**Status:** claimed

- [ ] Filter spaCy stopword lemmas consistently across the whole publication from vocabulary AND all count files.
- [ ] Provide a tracked, documented UTF-8 ignored-lemma list seeded with observed fillers, automatically used by every publishing route and overridable through the CLI.
- [ ] Normalize/validate the list, include the effective policy in the statistics identity, and prove list changes rebuild cache-only without changing stored analyses or transcripts.
- [ ] Preserve total/distinct/new-word summaries, all-word normalization and Pagefind search; remove the stopword toggle and show the required explanatory notice near the selection.
- [ ] Pass targeted CLI/browser checks, real cache-only five-episode publication, full fixture checks and separate Standards/Spec review; record integrated commit evidence.

## Comments

See the specification for exact normalization, errors and metric boundaries. Alphabetical word files and frequency-sorted count shards must remain deferred documentation options. Coordinator handles final integration evidence and shared planning/domain docs.

Assigned to filtered-statistics implementer after ticket01 integration.
