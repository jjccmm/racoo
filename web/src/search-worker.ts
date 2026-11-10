import type { Identity, SearchPage, SearchRequest, SearchResult, SearchOverview, Segment } from './search';

type Fragment = {
  content: string; raw_content?: string; word_count: number;
  anchors: { id: string; location: number }[];
};
type Episode = {
  title: string; episode_id: string; published_at: string; webpage_url?: string;
  source: { reference_url: string };
  audio: { url: string; duration_seconds: number };
  segments: Segment[];
};
type RawResult = { id: string; words: number[]; data(): Promise<Fragment> };
type Pagefind = { init(): Promise<void>; search(term: string): Promise<{ results: RawResult[] }> };
let engine: Pagefind | undefined;
const records = new Map<string, Episode>();
const queries = new Map<string, { result: RawResult; words: number[] }[]>();

// Pagefind 1.5.2 catches some index-download errors and otherwise returns an
// empty match list. Capture failures inside this isolated worker so a failed
// search cannot masquerade as a valid zero. No engine behavior is mocked.
const originalFetch = globalThis.fetch.bind(globalThis);
let fetchFailure: Error | undefined;
globalThis.fetch = async (...arguments_: Parameters<typeof fetch>) => {
  try {
    const response = await originalFetch(...arguments_);
    if (!response.ok) throw new Error(`Suchdatei nicht erreichbar (${response.status})`);
    return response;
  } catch (error) {
    fetchFailure = error instanceof Error ? error : new Error(String(error));
    throw error;
  }
};

async function search({ moduleUrl, episodes, terms, offset, targetEpisodeIds, mode, publicationId }: SearchRequest): Promise<SearchPage | SearchOverview> {
  fetchFailure = undefined;
  if (targetEpisodeIds?.length === 0) return { results: [], total: 0, terms };
  const allowed = targetEpisodeIds === undefined ? undefined : new Set(targetEpisodeIds);
  if (!engine) {
    const module = await import(/* @vite-ignore */ moduleUrl);
    engine = module.createInstance({ language: 'de', basePath: new URL('.', moduleUrl).href });
    await engine!.init();
  }
  type Candidate = {
    result: RawResult; identity: Identity; positionsByTerm: Record<string, number[]>; rankSum: number;
  };
  const union = new Map<string, Candidate>();
  for (const term of terms) {
    let results = queries.get(term);
    if (!results) {
      const raw = await engine!.search(term);
      if (fetchFailure) throw fetchFailure;
      results = raw.results.map((result) => {
        if (!Array.isArray(result.words) || result.words.some(position => !Number.isSafeInteger(position) || position < 0)) throw new Error('Ungültige Suchpositionen');
        return { result, words: [...new Set(result.words)] };
      });
      if (queries.size >= 30) queries.delete(queries.keys().next().value!);
      queries.set(term, results);
    }
    results.forEach(({ result, words }, rank) => {
      const identity = episodes[result.id];
      if (!identity) throw new Error('Folge fehlt im Suchstand');
      if (allowed && !allowed.has(identity.episodeId)) return;
      const candidate = union.get(result.id) ?? { result, identity, positionsByTerm: Object.create(null), rankSum: 0 };
      // Snapshot raw per-term positions before any detail object is loaded.
      candidate.positionsByTerm[term] = [...words];
      candidate.rankSum += rank;
      union.set(result.id, candidate);
    });
  }
  const candidates = [...union.values()].sort((a, b) =>
    Object.keys(b.positionsByTerm).length - Object.keys(a.positionsByTerm).length ||
    a.rankSum - b.rankSum ||
    Date.parse(b.identity.publishedAt) - Date.parse(a.identity.publishedAt) ||
    (a.identity.episodeId < b.identity.episodeId ? -1 : a.identity.episodeId > b.identity.episodeId ? 1 : 0),
  );
  if (mode === 'counts') return {
    publicationId, terms, total: candidates.length, episodes: candidates.map(({ identity, positionsByTerm }) => ({
      ...identity, counts: Object.fromEntries(terms.map((term) => [term, positionsByTerm[term]?.length ?? 0])),
      uniqueCount: new Set(Object.values(positionsByTerm).flat()).size,
    })),
  };
  // Coverage and all global tie-breaks are settled before the first fragment.
  const results: SearchResult[] = await Promise.all(candidates.slice(offset, offset + 10).map(async ({ result, identity, positionsByTerm, rankSum }) => {
    const [fragment, episode]: [Fragment, Episode] = await Promise.all([
      result.data(),
      records.get(identity.episodeId) ?? fetch(new URL(`episodes/${encodeURIComponent(identity.episodeId)}.json`, moduleUrl)).then((response) => response.json()),
    ]);
    if (episode.episode_id !== identity.episodeId || episode.published_at !== identity.publishedAt) {
      throw new Error('Suchindex und Folgendetails stimmen nicht überein');
    }
    records.delete(identity.episodeId);
    if (records.size >= 20) records.delete(records.keys().next().value!);
    records.set(identity.episodeId, episode);
    const indexedTokens = fragment.content.split(/[\r\n\s]+/g);
    const anchors = [...fragment.anchors].sort((a, b) => a.location - b.location);
    const originalTokens = new Map<string, RegExpExecArray[]>();
    const found = new Map<string, Map<string, { start: number; end: number; terms: Set<string> }>>();
    for (const [term, positions] of Object.entries(positionsByTerm)) {
      for (const position of positions) {
        const anchorIndex = anchors.indexOf(anchors.filter((item) => item.location <= position).at(-1)!);
        const anchor = anchors[anchorIndex];
        const segment = episode.segments.find((item) => item.id === anchor?.id);
        if (!segment || !Number.isSafeInteger(position) || position < 0 || (fragment.raw_content ?? fragment.content).includes('\u200b')) throw new Error('Textpositionen stimmen nicht überein');
        let tokens = originalTokens.get(segment.id);
        if (!tokens) {
          tokens = [...segment.text.matchAll(/\S+/gu)];
          const endLocation = anchors[anchorIndex + 1]?.location ?? fragment.word_count;
          if (!Number.isSafeInteger(anchor.location) || !Number.isSafeInteger(endLocation)
              || tokens.length !== endLocation - anchor.location || tokens.some((token, index) => {
                const indexed = indexedTokens[anchor.location + index];
                return indexed !== token[0] && !(index === tokens!.length - 1 && indexed === `${token[0]}.`);
              })) throw new Error('Originaltext und Suchpositionen stimmen nicht überein');
          originalTokens.set(segment.id, tokens);
        }
        const token = tokens[position - anchor.location];
        if (!token) throw new Error('Ungültige Textposition');
        const leading = token[0].match(/^[^\p{L}\p{M}\p{N}]+/u)?.[0].length ?? 0;
        const trailing = token[0].match(/[^\p{L}\p{M}\p{N}]+$/u)?.[0].length ?? 0;
        const start = token.index + leading;
        const end = token.index + token[0].length - trailing;
        if (end <= start) throw new Error('Ungültige Wortmarkierung');
        const ranges = found.get(segment.id) ?? new Map();
        const key = `${start}:${end}`;
        const range = ranges.get(key) ?? { start, end, terms: new Set<string>() };
        range.terms.add(term); ranges.set(key, range); found.set(segment.id, ranges);
      }
    }
    const passages = episode.segments.flatMap((segment) => {
      const ranges = found.get(segment.id);
      if (!ranges) return [];
      const highlights = [...ranges.values()].map((range) => ({ ...range, terms: [...range.terms].sort() })).sort((a, b) => a.start - b.start);
      return [{ ...segment, highlights, terms: [...new Set(highlights.flatMap((range) => range.terms))].sort() }];
    });
    return {
      ...identity,
      segments: episode.segments,
      searchId: result.id,
      title: episode.title,
      matchedTerms: Object.keys(positionsByTerm),
      positionsByTerm,
      rankSum,
      passages: passages.sort((a, b) =>
        b.terms.length - a.terms.length ||
        a.start_seconds - b.start_seconds,
      ),
      audioUrl: episode.audio.url,
      durationSeconds: episode.audio.duration_seconds,
      webpageUrl: episode.webpage_url ?? episode.source.reference_url,
    };
  }));
  return { results, total: candidates.length, terms };
}

// Serialize native calls: query-specific fragment caches must not race.
let queue = Promise.resolve();
globalThis.onmessage = (event: MessageEvent<SearchRequest & { requestId: number }>) => {
  const request = event.data;
  queue = queue.then(async () => {
    try {
      globalThis.postMessage({ requestId: request.requestId, value: await search(request) });
    } catch (error) {
      globalThis.postMessage({ requestId: request.requestId, error: error instanceof Error ? error.message : String(error) });
    }
  });
};
