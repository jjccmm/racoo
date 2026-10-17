# 07: Compare Grundformen across episode lengths

**What to build:** A listener can choose several Grundformen, compare frequency trends, and inspect Top-10-Folgen without confusing normalized rates with raw counts.

**Blocked by:** 06: Generate and inspect exact Grundform counts.

**Status:** claimed

**Spec coverage:** User stories 21, 22, 23, 24, 25, 28, 30 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Built-site browser selection, chart/table values, labels, and failed count-shard requests against known generated data.

- [ ] Provide bounded vocabulary suggestions and multiple selected Grundformen instead of a full unbounded vocabulary list.
- [ ] Hide stopwords from suggestions by default and offer a toggle that does not change total counts or the rate denominator.
- [ ] Use Recharts to show frequency per 1,000 Gesamtwörter by default and provide an explicitly labeled raw-count alternative.
- [ ] Offer Top-10-Folgen for selected words with the displayed quantity and units made clear.
- [ ] Represent a zero-word episode's normalized rate as unavailable, not infinity or a false numeric zero.
- [ ] Keep an absent known word/episode count distinct from a failed shard retrieval and show deliberate loading/error states.
- [ ] Verify multi-selection, exact values, normalization, the mode switch, stopword toggle, empty denominators, and failed retrieval through the browser with small independently worked examples.
