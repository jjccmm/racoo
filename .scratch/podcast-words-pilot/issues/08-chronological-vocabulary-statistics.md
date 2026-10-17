# 08: Inspect Gesamtwörter and vocabulary growth

**What to build:** A listener can inspect episode and pilot totals for Gesamtwörter, verschiedene Wörter, and neue Wörter with stable chronological meanings.

**Blocked by:** 06: Generate and inspect exact Grundform counts.

**Status:** claimed

**Spec coverage:** User stories 26, 27 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public statistics outputs and their built-site summary display using known episode texts/dates.

- [x] Produce episode and pilot-level Gesamtwörter including stopwords and distinct lowercase lemma statistics without confusing occurrences with vocabulary size.
- [x] Attribute neue Wörter to first occurrence by publication date and stable episode identity when dates tie, never processing/import order.
- [x] Show the agreed counts and brief definitions in the site, including sensible empty/zero-word data states.
- [x] Preserve results when the same known episodes are processed or imported in a different order.
- [x] Verify date ties, repeated lemmas, stopwords, known totals, and order independence through public generated statistics and visible summaries.


## Comments

- Implemented the public analyze --cache-only --publish catalog summary. A four-episode known cache verifies 9 total words including stopwords, 3 distinct lowercase lemmas, first occurrence assigned by publication time and stable identity tie, repeated lemmas counted once for distinct/new, a zero-word episode, and identical catalog/publication IDs after reversing input order.
- The built site displays the 17-episode fixture totals (349 total words, 42 distinct lemmas, 42 new lemmas) and chronological per-episode counts. A browser case also confirms that a zero-word episode displays zeros.
- Verification: Python analysis tests (4 passed), Ruff check/format, web lint/build, and built-site Playwright (25 passed).
- Status remains claimed pending integration merge and tracker resolution.
