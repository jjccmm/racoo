import type { Identity, SearchPage, SearchRequest, SearchResult, Segment } from './search';

type Fragment = {
  anchors: { id: string; location: number }[];
};
type Episode = { title: string; episode_id: string; published_at: string; segments: Segment[] };
type RawResult = { id: string; words: number[]; data(): Promise<Fragment> };
type Pagefind = { init(): Promise<void>; search(term: string): Promise<{ results: RawResult[] }> };

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

async function search({ moduleUrl, episodes, terms, offset }: SearchRequest): Promise<SearchPage> {
  const module = await import(/* @vite-ignore */ moduleUrl);
  const pagefind: Pagefind = module.createInstance({ language: 'de', basePath: new URL('.', moduleUrl).href });
  await pagefind.init();
  type Candidate = {
    result: RawResult; identity: Identity; positionsByTerm: Record<string, number[]>; rankSum: number;
  };
  const union = new Map<string, Candidate>();
  for (const term of terms) {
    const { results } = await pagefind.search(term);
    if (fetchFailure) throw fetchFailure;
    results.forEach((result, rank) => {
      const identity = episodes[result.id];
      if (!identity) throw new Error('Folge fehlt im Suchstand');
      const candidate = union.get(result.id) ?? { result, identity, positionsByTerm: {}, rankSum: 0 };
      // Snapshot raw per-term positions before any detail object is loaded.
      candidate.positionsByTerm[term] = [...result.words];
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
  // Coverage and all global tie-breaks are settled before the first fragment.
  const results: SearchResult[] = await Promise.all(candidates.slice(offset, offset + 10).map(async ({ result, identity, positionsByTerm, rankSum }) => {
    const [fragment, episode]: [Fragment, Episode] = await Promise.all([
      result.data(),
      fetch(new URL(`episodes/${encodeURIComponent(identity.episodeId)}.json`, moduleUrl)).then((response) => response.json()),
    ]);
    if (episode.episode_id !== identity.episodeId || episode.published_at !== identity.publishedAt) {
      throw new Error('Suchindex und Folgendetails stimmen nicht überein');
    }
    const matched = new Set(Object.values(positionsByTerm).flat().map((position) =>
      fragment.anchors.filter((anchor) => anchor.location <= position).at(-1)?.id,
    ));
    return {
      ...identity,
      searchId: result.id,
      title: episode.title,
      matchedTerms: Object.keys(positionsByTerm),
      positionsByTerm,
      rankSum,
      passages: episode.segments.filter((segment) => matched.has(segment.id)),
    };
  }));
  return { results, total: candidates.length, terms };
}

globalThis.onmessage = async (event: MessageEvent<SearchRequest>) => {
  try {
    globalThis.postMessage({ page: await search(event.data) });
  } catch (error) {
    globalThis.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
