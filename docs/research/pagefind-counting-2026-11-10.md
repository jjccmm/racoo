# Pagefind-only query counts for Racoo

Research date: 10 November 2026. Status: **unconfirmed proposal**, not a change to the confirmed product contract. This note investigates the search/counting part of the proposed free-text interface; the accompanying proposal is [Pagefind and minimap planning](../planning/pagefind-and-minimap.md). No application code, saved transcripts, analyses or production index were changed.

## Decision supported by the evidence

**Racoo can remove spaCy from its future search/counting path and avoid its custom word-count shards if the displayed measure becomes Pagefind search matches per query term.** It cannot preserve the current meaning of an exact German lemma count by renaming those matches. The existing locked engine already exposes enough raw positions to calculate a complete per-term, per-indexed-episode matrix before loading any result fragments or transcripts. Free-text input does not require a vocabulary lookup or an engine upgrade.

Use one independent, unquoted Pagefind search for each accepted input term and union their episode IDs. For a particular term and episode, count `new Set(result.words).size`; a successfully completed search without that episode contributes zero. Join these counts to every episode in the **indexed publication**, including zero rows, before selecting or ordering visible results. The 106 indexed episodes in this investigation are not the entire known feed/catalogue.

For the proposed stacked chart, the simplest consistent rule is to sum the independent per-term counts and label the sum as **Suchwort-Treffer**: each `(query term, matched text position)` pair contributes one. A position matching two terms contributes to both series. Keep the union of positions separately for highlighting, navigation and minimap markers. A sum of series is not a count of distinct spoken words. If distinct positions become the desired chart total, the chart must change: allocation to one series or an explicit overlap series would be required. Do not silently assign positions or merge input terms because they happen to return the same corpus-wide results.

These are proposed product rules. The current glossary and plan still define authoritative spaCy lemma counts; those contracts would need an explicit, coordinated revision before implementation.

## What is indexed today

Inspected [AGENTS.md](../../AGENTS.md), [PLAN.md](../../PLAN.md), [GLOSSARY.md](../../GLOSSARY.md), [development instructions](../development.md), [existing runtime findings](runtime-and-search-contracts.md), [highlight investigation](word-explorer-highlights.md), and the actual build/search implementation.

- [web/build/search-index.ts](../../web/build/search-index.ts) adds **one German HTML document per episode**, not one document per segment. Its paragraphs have segment IDs. Only transcript text is indexed; titles, dates and original episode records remain outside the lexical index.
- [web/src/search.ts](../../web/src/search.ts) currently normalizes NFC/lowercase, deduplicates and sorts whitespace-separated terms. Its public result is paginated by the application.
- [web/src/search-worker.ts](../../web/src/search-worker.ts) already searches terms independently, copies raw positions, unions candidates, and loads fragments/transcripts only for a slice of ten. The explorer currently supplies `targetEpisodeIds` after ranking with spaCy statistics. A complete Pagefind-derived chart must obtain the unscoped raw matrix **before** that restriction or ten-result slice; the current public `SearchPage` does not expose all candidate counts.
- A new worker is currently created and terminated for each `loadPage`, so its Pagefind cache does not survive subsequent pages. Reusing a successful query session is a possible implementation improvement, with the existing deliberate retry/error isolation preserved.

The manifest used was `web/dist/podcasts/podcast-ufo/search/manifest.json`, index ID `f376233a66369947c391ece1ddb3fd27ae51344ffdf4b784bef6ef7024c02d3d`, publication ID `07b1fcfb2ab7586fd165ce01d8399608c52bfc3a5e1ec03ea914afc1610f0368`. Its `pagefind-entry.json` reports German `page_count: 106` and version `1.5.2`. Both [package.json](../../web/package.json) and [package-lock.json](../../web/package-lock.json) lock Pagefind to `1.5.2`. Live Pagefind documentation displayed `v1.6.0` when checked; release-specific source and the installed runtime take precedence for this proposal.

## Public API fields and their meaning

The [v1.5.2 browser API types](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/types/index.d.ts) expose all matching page results in `results`, with `id`, ranking `score`, raw `words` positions and lazy `data()`. Detail data contains `content`, `word_count`, `locations`, `weighted_locations` and `anchors`. A location indexes a whitespace-split content token. `weighted_locations` adds ranking information; neither its weights nor the result score is an occurrence count. `raw_content` is marked internal. There is no public per-query `limit`, `offset`, Boolean-OR or disable-stemming/prefix option in these locked types.

The [API documentation](https://pagefind.app/docs/api/) separates searching from loading each result's detail data. This is why counts can be calculated from the complete raw results while fragment and transcript downloads remain limited to episodes the interface actually opens. Application pagination slices these raw results; it must not define the count universe.

The [v1.5.2 JavaScript implementation](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts) selects its exact/phrase path when the entire query is enclosed in double quotes. It also normalizes punctuation, case and diacritics and mutates cached fragment details when loading query-specific positions/excerpts. Keep the existing copied per-term raw positions. `raw_content` is processed indexing text, not an authoritative copy of the original transcript. `exactDiacritics` controls diacritic matching, not literal-word or lemma counting.

The [v1.5.2 search implementation](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web/src/search.rs) stems terms and performs prefix expansion; if no extensions exist, it can use the longest indexed prefix of the query. Regular multiword search intersects matching term sets; an entirely unmatchable term can be skipped when another term has matches. `OR` has no Boolean parser here. The exact/phrase path also stems, and its main match loop stops after the first contiguous match per page. Therefore quoted searches cannot be used to enumerate all occurrences or guarantee literal word forms. The normal path deduplicates output positions, including matches to multiple components of one compound. No edit-distance correction or semantic retrieval appears in these paths.

Pagefind's [language documentation](https://pagefind.app/docs/multilingual/) includes German stemming. Its [stemmer implementation](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_stem/src/lib.rs) wraps generated Snowball algorithms. Stems are retrieval keys, not dictionary lemmas. Snowball's own [German design notes](https://snowballstem.org/algorithms/german/stemmer.html) explain suffix/umlaut conflation, possible false conflations, and limits around German compounds and separable verbs. Those notes explain the distinction; the actual match observations below are from the locked runtime rather than assumptions about the latest Snowball revision.

## Observations on the existing real index

Read-only probes imported the generated Pagefind 1.5.2 JavaScript and WASM under Node 22.19.0. A `fetch` adapter returned the existing generated files directly from disk; it did not substitute the search engine. An independent Chromium probe used the installed Playwright 1.64.1, intercepted HTTP file requests and fulfilled them with those same bytes. The browser reproduced the three main terms and the stopword result below with **zero `.pf_fragment` and zero episode-transcript requests**. This is API evidence, not an end-to-end test of a migrated UI.

| Independent query | Matching episodes | Unique Pagefind positions, summed across episodes | Existing saved spaCy count for the corresponding lemma |
| --- | ---: | ---: | ---: |
| `Eimer` | 12 | 27 | `eimer`: 24 in 11 episodes |
| `Münzen` or `Münze` | 10 | 32 | `münze`: 16 in 9 episodes |
| `Kleingeld` | 12 | 33 | `kleingeld`: 31 in 12 episodes |
| `Haus`, `Häuser`, or `Hauses` | 102 each | 666 each | `haus`: 523 in 96 episodes |
| `Bank` or `Bänke` | 21 each | 80 each | `bank`: 53 in 15 episodes |
| `Mün` | 70 | 297 | No corresponding lemma comparison |
| `die` | 106 | 26,624 | Not published as a selectable statistic |

The union for `Eimer`, `Münzen`, `Kleingeld` contains **29 episodes**. The direct combined query `Eimer Münzen Kleingeld` returns only **one episode**, with 28 combined positions. The string `Eimer OR Münzen OR Kleingeld` returns zero in this index; it is not a request for that 29-episode union. Thus a combined search result cannot supply independent whole-publication counts for all three terms.

For the top `Münzen` result, UFO002, the nine raw positions refer to these original surface tokens: `Münzgeldtasche.`, `Münzen`, `Münzfach`, `Münzfach`, `Münzen`, `Münzgeldfahrer`, `Munzu`, `Münzgeldfach,`, `Münzgeldfach,`. A displayed value of nine would be a Pagefind match count, not nine instances of the spelling `Münzen`. The existing spaCy count for `münze` in that episode is two.

To make a third measure explicit, a separate scan of the original saved transcripts used NFC/lowercase and Unicode letter/mark components (`/[\p{L}\p{M}]+/gu`). It counted `eimer` 24, `münze` 13, `münzen` 11, `kleingeld` 31, `haus` 183, `häuser` 13, `hauses` 3, `bank` 46 and `bänke` zero. This is an explicitly chosen surface tokenizer, not spaCy or Pagefind. In particular, a query for `Bänke` finds 80 positions despite no literal `Bänke` component in the saved corpus.

These three columns of meaning cannot be interchanged. Exact surface counting would require an agreed tokenizer and original-text checking with proven candidate completeness. Linguistic lemma counting requires an additional linguistic analysis or a separate accepted approximation. Neither is supplied merely by counting Pagefind positions.

## Controlled edge cases

Small synthetic HTML documents were indexed with the already installed Pagefind Node API, kept entirely in memory via `getFiles()`, and searched with the real generated JavaScript/WASM. The [official Node API](https://pagefind.app/docs/node-api/) supports in-memory input/output. No corpus build, ASR, NLP model, new dependency, repository asset or index file was generated.

| Fixture or query | Observed locked-engine behavior | Consequence |
| --- | --- | --- |
| `Münze Münze Münze.` | Unquoted `Münze` returns positions `[0,1,2]`; quoted `"Münze"` returns `[0]`. | Quotes truncate enumeration even for one repeated word. |
| `Eimer Münzen Eimer Münzen.` | Quoted `"Eimer Münzen"` returns `[0,1]` only. | Native phrase positions are not an all-phrase occurrence count. |
| Separate paragraphs `Eimer.` and `Münzen.` | The quoted two-word phrase returns both adjacent indexed positions. | Paragraph/segment and punctuation boundaries do not ensure phrase isolation. |
| `Haus Häuser Hauses.` | Each unquoted form matches all three positions. | Useful German inflection conflation; not proof of universal lemma equivalence. |
| `Bank Bänke Banken.` | Each unquoted form matches all three positions. | No separation of bench/bank senses or plural meanings. |
| `die die die.` | `die` returns all three positions. | Stopwords are still in this index and search path. |
| `Wort/Teil Wort/Teil.` | `Wort` and `Teil` independently return the same two positions. | Two series sum to four term-position pairs, with two distinct text positions. |
| `Euro-Münze Creditmünze.` | `Euro` finds the hyphenated token; `Münze` finds that token but not `Creditmünze`; `Credit` finds `Creditmünze`. | Hyphen components and left prefixes are not full compound decomposition. |
| `Münzzen` | Can match genuine `Münze`/`Münzen` positions through prefix fallback. | Some misspellings accidentally match; this is not a general typo guarantee. |
| `abcdefgxyz` | No results in the tiny fixture; combined `Eimer abcdefgxyz` still returns Eimer documents. | Search each accepted term independently to retain honest zeros. |

The larger mixed-form fixture also exposed interactions between variant lists and the quoted path. Do not generalize its returned count as exactly one per document either; the pure fixtures above establish the decisive limitation. No supported switch was found for complete stem-only or literal-only counts while disabling prefix matching. Changing ranking similarity can adjust order but does not turn matches into exact occurrences; see [Pagefind ranking documentation](https://pagefind.app/docs/ranking/).

No semantic similarity, synonym expansion or correction of an ASR mistake can be promised. A remembered synonym absent from the transcript is outside this lexical contract. Identical result sets for `Haus`/`Häuser` in this publication also do not establish that two arbitrary query terms mean the same thing.

## Segment positions and retained transcript mapping

The existing mapping is sufficient for passages without per-word timestamps. A read-only comparison covered **all 106 stored episode documents, 1,306 segments and 1,184,373 original whitespace tokens** in the inspected index. Every segment's token count and text aligned with its fragment anchors, allowing the already documented Pagefind-added final period at 155 segment endings. There were zero other alignment failures. This is a check of this generated publication, not a promise about every future text/index configuration.

Retain the stable episode-ID mapping, publication/index binding, segment IDs, original transcript records and their coarse start/end times. For a hit, find the last segment anchor at or before the raw position, subtract its location, and use original `segment.text` whitespace-token UTF-16 spans. Keep the existing guards for counts, original spelling and unsupported zero-width segmentation. The [sub-results documentation](https://pagefind.app/docs/sub-results/) permits custom calculations from anchors; native heading-based excerpts are not a list of all transcript segments or hits.

Two term hits on one whitespace token need one visual range carrying both term identities. Raw positions provide neither internal compound character offsets nor a more precise audio time. Keep jumps at the saved coarse segment start and preserve the advertising/offset notice. Removing spaCy does not require discarding authoritative transcripts or their time/identity contracts.

## Proposed bounded implementation contract and remaining proof

For a first migration, accept up to five distinct normalized ordinary terms from a single free-text input. State that word forms and prefixes can match. Do not introduce phrase/operator syntax implicitly by passing arbitrary user quotes through the exact path. If common/ignored query words are excluded, use an explicit small static query-word list and visible feedback, separate from Pagefind indexing. Removing spaCy also removes its model-provided stopword/lemma vocabulary; a manual list is a product rule, not a substitute language model. A stopword-only input should have a defined empty/help state, not trigger an unbounded archive-wide query by accident.

A worker can return a sparse map of copied per-term positions/counts for the full candidate union and a complete catalogue of indexed identities. Fill zeros only after successful completion. Compute chart series, totals, coverage and application ordering from that map, then lazily load chosen details. Preserve aborts, stale-generation protection, explicit retry, and download-error detection: an unsuccessful index request must remain an error, not a zero count. Avoid a second aggregate index when Pagefind already carries the required postings.

This removes a separate count-shard/vocabulary publication requirement, but it does not remove all custom browser logic or the normal Pagefind index build. Existing total-word, distinct-lemma, new-lemma and vocabulary-growth statistics would lose their current definitions if spaCy analysis is removed; retaining those features would need separate scope and definitions rather than fabricated replacements from query matches.

The observed 106-episode files establish functional feasibility. They do **not** establish a latency, memory or bandwidth guarantee for 600 episodes, a mobile device, cold internet cache, five broad terms or a full archive. Raw positional lists still grow with matches, even when detail downloads remain lazy; `die` already produces 26,624 positions here. Measure cold/warm query bytes, elapsed time, memory, cancellation and repeated queries on a representative full publication before claiming performance. Keep Pagefind pinned during this semantic migration and repeat the relevant real-engine contract probes for any later upgrade.

Before implementation acceptance, prove independent full-union counts beyond the first ten results, indexed zero episodes, duplicate and overlapping terms, inflection/prefix/compound examples, manual excluded-word behavior, no-result and failed-request distinction, preserved original spans/audio jumps, stale requests and both root/project base paths. Add a user-visible explanation and update the plan/glossary/data consumers together only after the proposal is confirmed.
