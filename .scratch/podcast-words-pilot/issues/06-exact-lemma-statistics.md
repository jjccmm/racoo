# 06: Generate and inspect exact Grundform counts

**What to build:** An operator can analyze valid episode records and a visitor can inspect one Grundform's exact per-episode counts in the built site.

**Blocked by:** None (can start immediately).

**Status:** claimed

**Spec coverage:** User stories 21, 26, 28, 44, 45, 47, 49 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public analysis/build commands to saved versioned outputs, then a basic browser word-count view; independently worked token/lemma examples and a separate real spaCy-model check.

- [x] Pin spaCy and de_core_news_lg and demonstrate the selected German model on known text; keep its model download outside ordinary offline checks.
- [x] Count every alphabetic token including stopwords as Gesamtwörter, use lowercase lemmas for distinct forms, retain stopword flags, and leave original transcript text untouched.
- [x] Save versioned per-episode analyses and reusable catalog/vocabulary/count outputs; sparse per-lemma episode counts start in 64 shards with the vocabulary identifying the correct shard.
- [x] Expose a bounded basic word selection and exact per-episode count view in the built app, so this is a producer-to-consumer slice rather than analysis-only scaffolding.
- [x] Treat a missing known word/episode entry as zero, a failed data load as an error, and counts above 255 as ordinary non-truncated integer values.
- [x] Reuse a valid cached analysis when its consumed input/settings are unchanged and recompute analysis, without ASR, when analysis inputs/version change.
- [x] Verify known lemma/count/stopword outcomes through the processing/artifact boundary and the basic browser view, with independently supplied expected values rather than a duplicate of production counting logic.

## Comments

### 2026-10-17 — Implementation and evidence (integration pending)

- Added the public `podcast-words analyze` command, validated versioned per-episode caches, and synchronized `schema --kind analysis` export. Only consumed segment texts and analysis settings invalidate a cached analysis; metadata changes refresh publication metadata without loading NLP or invoking ASR. Transcripts remain untouched.
- Optional spaCy 3.8.16 is pinned in the manifest/lockfile; the adapter requires `de_core_news_lg` 3.8.0, installed separately from its exact wheel URL. The explicit real-model check exercises the public command on an independently counted six-token German example; [recorded evidence](../../../docs/research/evidence/spacy-analysis-2026-10-17.json) reports the expected `der:1`, `hund:2`, `laufen:2`, `ein:1` and stopword flags. Model weights remain untracked and absent from routine checks.
- Static publication emits catalog/vocabulary plus exactly 64 sparse shards, all bound to one publication ID. Vite calls the public command with `--cache-only` against the same declared corpus as search. Versioned synthetic analyses were produced with the real pinned model; the second synthetic transcript includes exactly 256 additional `Hund` tokens for the wide-integer browser proof.
- Added a separate `Stats` component with at most ten vocabulary suggestions, a stopword switch, and exact per-episode absolute counts. A missing known pair displays zero; a failed shard displays an error and permits a deliberate retry. No count shards load before word selection. The stopword switch preserves all 284 fixture Gesamtwörter.
- TDD used the confirmed CLI/artifact and built-browser boundaries. The initial CLI count case failed because `analyze` was absent; the browser case failed because word selection was absent; both then passed. Offline CLI cases control only the external spaCy model output. Expected counts are fixed worked examples, including 258 in CLI output and 256 in the real-model browser fixture.
- `uv run --frozen python scripts/check.py` completed with exit 0: Ruff, 41 Python cases, documentation/schema/notebook checks, prefix/root builds, and all 15 Chromium cases. Separately, all 15 browser cases passed under `/podcast_words_v3/` with exit 0. Windows browser teardown required process permissions as documented; no product workaround was added. The explicit model runner passed using the root preflight environment with this checkout's package installed.
- Merged integration tip `9876268` before completion. Ticket remains `claimed` until the coordinator integrates the implementation and records final resolution. Real pilot episode analyses and later multi-selection/trend/aggregate work remain the responsibilities of dependent tickets; this evidence does not claim pilot acceptance or archive approval.

### 2026-10-17 — Final integration sync

Implementation commit: `1bce2a1`. Merged the later CPU-transcription integration `10ea882`, preserving both public commands, both documentation updates, the optional spaCy extra, and the integrated ASR pins. Regenerated the combined lock from the merged manifest using cached metadata. The affected checks passed after the merge: 44 Python cases, Ruff lint/format, documentation links/notebook syntax, and the production build with actual Pagefind plus cache-only statistics publication. The merge changes no visitor statistics behavior; the preceding 15 root and 15 project-prefix browser cases remain the behavior evidence, and the coordinator runs the final combined shared check.
