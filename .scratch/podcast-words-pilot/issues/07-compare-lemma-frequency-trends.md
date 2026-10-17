# 07: Compare Grundformen across episode lengths

**What to build:** A listener can choose several Grundformen, compare frequency trends, and inspect Top-10-Folgen without confusing normalized rates with raw counts.

**Blocked by:** 06: Generate and inspect exact Grundform counts.

**Status:** resolved

**Spec coverage:** User stories 21, 22, 23, 24, 25, 28, 30 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Built-site browser selection, chart/table values, labels, and failed count-shard requests against known generated data.

- [x] Provide bounded vocabulary suggestions and multiple selected Grundformen instead of a full unbounded vocabulary list.
- [x] Hide stopwords from suggestions by default and offer a toggle that does not change total counts or the rate denominator.
- [x] Use Recharts to show frequency per 1,000 Gesamtwörter by default and provide an explicitly labeled raw-count alternative.
- [x] Offer Top-10-Folgen for selected words with the displayed quantity and units made clear.
- [x] Represent a zero-word episode's normalized rate as unavailable, not infinity or a false numeric zero.
- [x] Keep an absent known word/episode count distinct from a failed shard retrieval and show deliberate loading/error states.
- [x] Verify multi-selection, exact values, normalization, the mode switch, stopword toggle, empty denominators, and failed retrieval through the browser with small independently worked examples.

## Comments

Implemented multi-selection and comparison in the built site, with up to 10 suggestions and 5 selected Grundformen. Stopword filtering affects suggestions only; total-word denominators remain unchanged. The default chart uses frequency per 1,000 total words, including stopwords in the denominator; raw counts are an explicit alternative. Top-10 episode tables show the selected quantity and units. Empty episodes display normalized rates as unavailable; a missing word/episode pair is zero, while a failed shard displays an error and retry action.

Recharts 3.10.1 is pinned in both web/package.json and web/package-lock.json. Its official package peer dependencies include React and React DOM 19, matching this project. Verification: npm.cmd --prefix web run build; npm.cmd --prefix web run lint; PW_PORT=4197 npm.cmd --prefix web run test:browser (27 passed). Browser examples independently check 256/269*1,000 = 951.7 and 3/5*1,000 = 600, unchanged 349-word totals under stopword toggling, raw-count mode, zero-word availability, missing pairs, failed shards, and bounded selections. No model or ASR downloads were used.


### Integration acceptance — 17 October 2026

Merged with no fast-forward as `3aa929e`. The CSS merge retained the passage player and vocabulary summary alongside the lazy Recharts view. Root and `/podcast_words_v3/` production builds and browser suites passed: 31/31 cases at each path. The integrated cases verify normalized and raw values, stopword-independent denominators, zero-word unavailable rates, missing-pair zero counts, failed-shard errors and deliberate retry. Recharts 3.10.1 was installed from the local npm cache using the lockfile; lint passed.
