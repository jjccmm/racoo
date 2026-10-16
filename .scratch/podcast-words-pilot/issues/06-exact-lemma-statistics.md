# 06: Generate and inspect exact Grundform counts

**What to build:** An operator can analyze valid episode records and a visitor can inspect one Grundform's exact per-episode counts in the built site.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Spec coverage:** User stories 21, 26, 28, 44, 45, 47, 49 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public analysis/build commands to saved versioned outputs, then a basic browser word-count view; independently worked token/lemma examples and a separate real spaCy-model check.

- [ ] Pin spaCy and de_core_news_lg and demonstrate the selected German model on known text; keep its model download outside ordinary offline checks.
- [ ] Count every alphabetic token including stopwords as Gesamtwörter, use lowercase lemmas for distinct forms, retain stopword flags, and leave original transcript text untouched.
- [ ] Save versioned per-episode analyses and reusable catalog/vocabulary/count outputs; sparse per-lemma episode counts start in 64 shards with the vocabulary identifying the correct shard.
- [ ] Expose a bounded basic word selection and exact per-episode count view in the built app, so this is a producer-to-consumer slice rather than analysis-only scaffolding.
- [ ] Treat a missing known word/episode entry as zero, a failed data load as an error, and counts above 255 as ordinary non-truncated integer values.
- [ ] Reuse a valid cached analysis when its consumed input/settings are unchanged and recompute analysis, without ASR, when analysis inputs/version change.
- [ ] Verify known lemma/count/stopword outcomes through the processing/artifact boundary and the basic browser view, with independently supplied expected values rather than a duplicate of production counting logic.
