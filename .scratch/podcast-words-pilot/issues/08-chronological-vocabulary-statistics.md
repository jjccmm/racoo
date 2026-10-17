# 08: Inspect Gesamtwörter and vocabulary growth

**What to build:** A listener can inspect episode and pilot totals for Gesamtwörter, verschiedene Wörter, and neue Wörter with stable chronological meanings.

**Blocked by:** 06: Generate and inspect exact Grundform counts.

**Status:** claimed

**Spec coverage:** User stories 26, 27 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public statistics outputs and their built-site summary display using known episode texts/dates.

- [ ] Produce episode and pilot-level Gesamtwörter including stopwords and distinct lowercase lemma statistics without confusing occurrences with vocabulary size.
- [ ] Attribute neue Wörter to first occurrence by publication date and stable episode identity when dates tie, never processing/import order.
- [ ] Show the agreed counts and brief definitions in the site, including sensible empty/zero-word data states.
- [ ] Preserve results when the same known episodes are processed or imported in a different order.
- [ ] Verify date ties, repeated lemmas, stopwords, known totals, and order independence through public generated statistics and visible summaries.
