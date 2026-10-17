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

## Comments

### Implementation evidence — 17 October 2026, awaiting integration

All seven criteria are implemented on `pilot/04-coverage`; status stays `claimed` pending integration review.

- A separate 15-episode controlled corpus extends the original two fixtures without changing them. Its [worked example](../../../tests/fixtures/search-coverage/README.md) records independent coverage expectations, observed native Pagefind rank lists and manually summed ranks. The full three-term order demonstrates coverage before rank sum, rank sum before date, actual publication instants despite differing UTC offsets, and stable identity after equal instants/rank sums.
- NFC, German lowercasing, whitespace separation, duplicate elimination and deterministic distinct-term queries preserve coverage under repetition, case and input reordering. Native German “Fuß Gruss” finds “Füße und Grüße”; “Katze Fenster” retains word-form matches without an exact-spelling filter. Partial coverage and matched Stichwörter are explicit and remain distinct from exact lemma counts.
- Raw search IDs and index-bound identity/date metadata settle the entire order before detail loading. Real browser requests prove zero transcript/fragment requests at navigation, exactly ten initially for fifteen candidates, and only the remaining five on request. Copied positions are retained separately for each term. A modular index-bound session loads pages and supports cancellation for the later passage/player work.
- A failed additional page preserves the first ten results, shows an error and retries only after another click. Controlled delayed initial and additional-page responses cannot overwrite or append to a newer query. Loading, empty, no-match, partial and fetch-error states are exercised through the actual built app and generated index.
- Full `uv run --frozen python scripts/check.py` passed with exit 0 before the forthcoming integration merge: 38 Python tests, Ruff lint/format, Markdown/notebook checks, fixture validation, root/project builds, web lint/typecheck and 20 real Chromium checks. Exact host setup: repository-local `.cache`, `PYTEST_ADDOPTS=--basetemp=.cache/pytest-coverage-check`, shared `UV_CACHE_DIR=C:/Users/User/Code/podcast_words_v3/.uv-cache`, and `PW_PORT=4194`; run the complete invocation in the approved host context so Playwright can terminate its own preview process tree.

The app's synthetic-data notice contains visitor-relevant data state. Search UI is isolated in `SearchPanel.tsx`; the App shell is ready for the independently implemented statistics component. Ticket05 retains passage proximity, shared audio, direct links and playback behavior.

### Integrated verification — 17 October 2026

Implementation commit `22d7d1e` was followed by merge `26b8a64`, incorporating integration tip `7c1b1ac` with the CPU transcription and exact-analysis work. The App shell now renders both `SearchPanel` and `Stats`. The public analysis command, run with the installed spaCy 3.8.16 / `de_core_news_lg` 3.8.0 environment, computed saved analyses for all 15 new fixtures and reused the original two. Both consumers build from the same 17-episode corpus and retain strict stale-cache validation.

The independent total is 284 original words + 25 complete-text words + 4×5 pair words + 10×2 single words = 349; browser statistics expectations record this calculation. The complete integrated `uv run --frozen python scripts/check.py` passed with exit 0: 44 Python tests, 23 real Chromium cases, Ruff, documentation/notebook checks, authoritative validation, TypeScript/lint and both production baselines. The integrated run used `PYTEST_ADDOPTS=--basetemp=.cache/pytest-coverage-integrated` and `PW_PORT=4194` in the approved host context. No model was loaded by routine checks; the explicit analysis preparation reused the already installed model. Status remains `claimed` for integration review.
