# 04: Rank remembered Stichwörter with lazy result details

**What to build:** A visitor can search several remembered words and receive stable, labeled coverage groups while loading only the needed result details.

**Blocked by:** 03: Find a known passage using a real Pagefind index.

**Status:** claimed

**Spec coverage:** User stories 1, 2, 3, 4, 5, 6, 7, 9, 13, 14, 30, 49 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Built-site browser queries, visible result order/coverage, and observed network requests over a real controlled Pagefind corpus.

- [ ] Normalize nonempty distinct input Stichwörter case-insensitively, ignore repeats, query terms separately, and union episode candidates independently of input order.
- [ ] Order by distinct-term coverage descending, then the sum of matching Pagefind ranks ascending, publication date descending, and stable episode identity; show partial coverage.
- [ ] Preserve German stemming without an exact-spelling filter and keep search coverage distinct from exact lemma counts.
- [ ] Use raw candidate IDs and the index-bound episode/date mapping to establish the complete order before eagerly loading all result fragments.
- [ ] Load at most the first ten result details initially and provide explicit additional loading; neither initial navigation nor coverage calculation fetches every transcript.
- [ ] Keep the newest query authoritative and show loading, no-result, partial, and fetch-failure states without self-triggered retry/reload loops.
- [ ] Verify all tie-breakers, 3/3 before 2/3 before 1/3, repeated/case-varied/reordered terms, inflections, umlauts and sharp S using a real corpus with more than ten candidates and independently known expectations.
