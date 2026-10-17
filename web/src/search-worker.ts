import type { SearchRequest, SearchResult, Segment } from './search';

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

async function search({ moduleUrl, episodes, term }: SearchRequest): Promise<SearchResult[]> {
  const module = await import(/* @vite-ignore */ moduleUrl);
  const pagefind: Pagefind = module.createInstance({ language: 'de', basePath: new URL('.', moduleUrl).href });
  await pagefind.init();
  const { results } = await pagefind.search(term);
  if (fetchFailure) throw fetchFailure;
  // Raw .words belong to this query. Snapshot them instead of retaining
  // detail objects whose cache/clone behavior can vary between engine builds.
  const candidates = results.map((result) => {
    const identity = episodes[result.id];
    if (!identity) throw new Error('Folge fehlt im Suchstand');
    return { result, identity, positions: [...result.words] };
  });
  return Promise.all(candidates.slice(0, 10).map(async ({ result, identity, positions }) => {
    const [fragment, episode]: [Fragment, Episode] = await Promise.all([
      result.data(),
      fetch(new URL(`episodes/${encodeURIComponent(identity.episodeId)}.json`, moduleUrl)).then((response) => response.json()),
    ]);
    if (episode.episode_id !== identity.episodeId || episode.published_at !== identity.publishedAt) {
      throw new Error('Suchindex und Folgendetails stimmen nicht überein');
    }
    const matched = new Set(positions.map((position) =>
      fragment.anchors.filter((anchor) => anchor.location <= position).at(-1)?.id,
    ));
    return {
      ...identity,
      searchId: result.id,
      title: episode.title,
      term,
      positions,
      passages: episode.segments.filter((segment) => matched.has(segment.id)),
    };
  }));
}

globalThis.onmessage = async (event: MessageEvent<SearchRequest>) => {
  try {
    globalThis.postMessage({ results: await search(event.data) });
  } catch (error) {
    globalThis.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
