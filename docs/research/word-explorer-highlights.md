# Pagefind positions to original highlighted passages

Read-only exploration, 2026-11-07. Repository: C:/Users/User/Code/podcast_words_v3. Inspected AGENTS.md, GLOSSARY.md, PLAN.md, TASKS.md, docs/development.md, docs/research/runtime-and-search-contracts.md, web/src/search.ts, web/src/search-worker.ts, web/build/search-index.ts, SearchPanel.tsx, search/passages/coverage/native-ranks browser tests, and the actual generated Pagefind 1.5.2 runtime. No repository changes, model calls, ASR, new dependencies, or external network search.

## Conclusion

Use the saved raw result.words positions and Pagefind segment anchors to identify ORIGINAL whitespace-token character ranges. Do not search the original text for the selected lemma string. No new published data format or spaCy rerun is needed. This supports inflections and actual surface tokens while preserving original punctuation, whitespace, spelling and Unicode. Pagefind lexical matches remain separate from authoritative spaCy aggregate counts and episode ranking.

## Evidence from pinned runtime and real five-episode build

The native build_excerpt function in generated pagefind-worker.js splits fragment text with /[\r\n\s]+/g, except for its zero-width-space-delimited language path. The native search interface exposes these indices in result.words. result.data() exposes content, raw_content, word_count and anchors with { element, id, text, location }. The current TS Fragment type only declares anchors and can be extended locally without changing assets.

All 50,210 whitespace tokens across 58 segments of the real five-episode build align by ordinal index between original segment text and fragment content. Original token offsets must be measured with [...segment.text.matchAll(/\S+/gu)], whose match.index uses JavaScript UTF-16 offsets compatible with slice(). There were exactly seven token-text differences: Pagefind appended '.' to the last token of an otherwise unpunctuated paragraph. Counts/positions were unchanged. For example original final 'thing' becomes fragment 'thing.', and original final 'Go-quit.de' becomes 'Go-quit.de.'. All real fragments have no zero-width-space delimiter.

Native browser queries against http://127.0.0.1:4173/:

- Münze and Münzen both return positions [515, 666, 936] in the KI experiment episode: original surface tokens Euro-Münze, Münze. and Münze (the final token at 936 has no punctuation). No literal Münzen is necessary.
- Bahn returns U-Bahn at position 256 in UGO081, Bahn. in the KI episode, and Bahnhofe in UFO537.
- Euro returns Euro-Münze and also Europa/Europapark. Prefix/lexical behavior can differ substantially from spaCy lemma counts.
- Credit returns Creditmünze. in UFO300; Münze does not return that compound there. Do not infer full linguistic compound coverage.

An in-memory controlled native Pagefind index (no repository assets written) verified Münze -> Münzen at position 3 using the existing synthetic segment text, plus Euro-Münze, U-Bahn, quoted „Münze“, Münze!, (Münzen), Wort/Teil., NBSP, tabs, emoji before the hit, Straße, Füße and a decomposed combining accent. Both Wort and Teil point to the SAME whitespace token Wort/Teil.; the engine does not supply character offsets for the internal part. A verbose:true query did not add usable subtoken character offsets to weighted_locations. Highlight the whole matched original surface token rather than inventing a component boundary.

## Minimal original-span algorithm

Extend Fragment locally to include content:string, word_count:number and optionally raw_content:string; anchors may include text:string for an additional source check. Keep copying result.words for each term before .data(), as the current worker does.

1. Preserve segment.text exactly. Do not lowercase or NFC-normalize it before measuring offsets.
2. Split fragment.content with the exact pinned native regex /[\r\n\s]+/g. Reject unsupported zero-width-space indexing if (fragment.raw_content ?? fragment.content).includes('\u200B'); .content itself may already have removed these delimiters.
3. Sort/use the existing segment anchors and find the last anchor with location <= hit position. Map its id to the original segment. Do not use fragment.excerpt or sub_results: excerpts omit other hits, and native sub_results only treats headings as subresult boundaries.
4. Tokenize that original segment once with /\S+/gu, retaining each match.index and match[0].length.
5. Guard alignment BEFORE emitting any spans: original token count must equal (next segment anchor.location - this anchor.location), or (fragment.word_count - last anchor.location). The corresponding fragment token slice must match each original token exactly, allowing only fragmentToken === originalToken + '.' for the segment's FINAL token, the observed Pagefind paragraph punctuation normalization. Validate anchor identity, integer/within-bounds positions, and nonempty token arrays. If using anchor.text, trim only outer whitespace when comparing against the original; do not assume exact outer whitespace survives.
6. The matching original token is tokens[position - anchor.location]. Let tokenStart = match.index and tokenEnd = tokenStart + match[0].length. These are exact original UTF-16 offsets.
7. Either highlight the whole whitespace token (native Pagefind convention), or trim only outer non-letter/non-mark/non-number characters from the mark while keeping them in the surrounding original text. Suggested trim regex: /^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu. Include \p{M} so a decomposed accent is not removed. Keep internal hyphens/slashes/apostrophes intact. For Euro-Münze, mark Euro-Münze; for „Münze“, mark Münze and retain quotation marks/comma outside.
8. Union duplicate ranges across terms, preserving a terms[] list per range. Sort ascending by start/end, and merge overlap when rendering so no nested/duplicate mark tags occur. Display original text by slice() and React text nodes/<mark>; do not insert HTML strings.
9. For the short excerpt, locate its center/start using the first actual highlight start rather than lower.indexOf(lemma). Expand the excerpt boundaries enough to include whole marked tokens. Translate/clamp ranges into that excerpt or render source slices with global offsets. Full-segment details can use the same ranges. No word timestamp is inferred; audio still jumps to segment.start_seconds.

On alignment failure, preserve chart/count/rank results and show a passage/highlight error through the existing passage-error path. Do not quietly invent offsets or fall back to literal-lemma highlighting. A genuine lexical no-match is a separate successful empty passage state. Existing counts may remain positive in that state.

## Small proposed API

In search.ts:

  export type Highlight = { start: number; end: number; terms: string[] };
  export type Passage = Segment & { terms: string[]; highlights: Highlight[] };
  export type SearchRequest = SearchIndex & {
    terms: string[]; offset: number; targetEpisodeIds?: string[];
  };

A minimal compatible public signature is:

  searchEpisodes(query: string, signal: AbortSignal,
    options: { targetEpisodeIds?: string[] } = {}): Promise<SearchSession>

Pass the optional targets through both initial/loadMore worker requests. Keep unscoped callers' current semantics. targetEpisodeIds:[] means intentionally load NOTHING, not unscoped search; distinguish undefined from an empty array. For the unified word explorer, caller computes authoritative spaCy top ten first, passes their stable IDs, then joins search results back to that ranked list by episodeId. Do not allow Pagefind's candidate/rank order to reorder spaCy top-ten cards. No-match ranked episodes remain in the ranked list with their count and an honest passage status.

In worker search(), build allowed = targets === undefined ? undefined : new Set(targets). In the per-term raw-result loop, resolve/validate episodes[result.id], then if (allowed && !allowed.has(identity.episodeId)) return/continue BEFORE adding candidate to union. Sorting, slice and result.data()/episode fetch happen only after this filter. Early return for an explicit empty target list can avoid even loading Pagefind. Never search first, load a normal global page, and filter those loaded records in the UI.

A native browser proof searched Euro (five raw episode candidates), selected only Prolog's stable episodeId from the compact map, and only then loaded .data() and its transcript. Observed requests: exactly ONE .pf_fragment plus ONE episodes/<PrologId>.json, and no other episode details. The six resulting original spans sliced to 'Euro' at the expected original segment character positions.

Optional scoped API return ordering should remain explicit: either preserve the supplied targets order within the scoped results, or (smaller change) retain existing search ordering and join by ID in the explorer. The latter keeps the existing generic search contract intact. Since targets contain at most ten distinct ranked episodes, every matching target fits the initial page. No fragment/transcript request may target a non-top-ten episode.

## Product semantics and focused validation

Suggested concise explanatory text: 'Die Zahlen stammen aus der Grundformanalyse. Markierungen zeigen die Wortformtreffer der Suche und können davon abweichen.' If no lexical passages exist for a positive ranked count, state that explicitly rather than saying the count was zero.

Use the current shared audio choose/player path. This exploration does not require an audio control rewrite.

Focused implementation evidence should cover: native Münze -> Münzen; multiple occurrences in the same segment; quoted/punctuated words; compound token selection; whitespace and UTF-16 offsets (emoji/combining mark); Pagefind-added final period; a deliberately mismatched fragment/source guard; union of two terms pointing to one token; scoped request observing zero forbidden fragment/episode downloads; explicit empty targets; and a positive spaCy count with no native lexical passage. Existing search abort/error/retry, deep links, project base path and shared-player behavior must remain intact.

Temporary probe scripts are under C:/Users/User/AppData/Local/Temp/pw-passage-*.cjs. No build assets or source files were changed.

