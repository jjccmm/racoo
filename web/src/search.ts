export type Segment = { id: string; text: string; start_seconds: number; end_seconds: number };
export type Occurrence = { id: string; seconds: number; terms: string[]; nearbyTerms: string[] };
export type Passage = Segment & { occurrences: Occurrence[] };
export type Identity = { episodeId: string; publishedAt: string };
type SearchIndex = { moduleUrl: string; episodes: Record<string, Identity> };
export type SearchRequest = SearchIndex & { terms: string[]; offset: number };
export type SearchResult = Identity & {
  searchId: string;
  title: string;
  matchedTerms: string[];
  positionsByTerm: Record<string, number[]>;
  rankSum: number;
  passages: Passage[];
  audioUrl: string;
  durationSeconds: number;
  webpageUrl: string;
};
export type SearchPage = { results: SearchResult[]; total: number; terms: string[] };
export type SearchSession = { initial: SearchPage; loadMore(): Promise<SearchPage> };

const base = import.meta.env.BASE_URL;

async function json(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Datei nicht erreichbar (${response.status})`);
  return response.json();
}

async function loadIndex(signal: AbortSignal): Promise<SearchIndex> {
  const manifest = await json(`${base}search/manifest.json`, signal);
  if (!/^[a-f0-9]{64}$/.test(manifest.indexId)) throw new Error('Ungültiger Suchstand');
  const directory = `${base}search/${manifest.indexId}/`;
  const mapping = await json(`${directory}episodes.json`, signal);
  if (mapping.indexId !== manifest.indexId) throw new Error('Suchindex und Folgenzuordnung stimmen nicht überein');
  const moduleUrl = new URL(`${directory}pagefind.js`, window.location.href).href;
  return { moduleUrl, episodes: mapping.episodes };
}

async function loadPage(request: SearchRequest, signal: AbortSignal): Promise<SearchPage> {
  signal.throwIfAborted();
  // A fresh worker isolates Pagefind's mutable cache and its fetch handling.
  // A deliberate retry starts fresh after a failed chunk instead of reusing a
  // cached failed load. The worker never changes the page's fetch function.
  const worker = new Worker(new URL('./search-worker.ts', import.meta.url), { type: 'module' });
  try {
    return await new Promise<SearchPage>((resolve, reject) => {
      const abort = () => { window.clearTimeout(timeout); reject(signal.reason); };
      const timeout = window.setTimeout(() => {
        signal.removeEventListener('abort', abort);
        reject(new Error('Zeitlimit der Suche überschritten'));
      }, 20000);
      signal.addEventListener('abort', abort, { once: true });
      worker.onmessage = (event: MessageEvent<{ page?: SearchPage; error?: string }>) => {
        window.clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.page!);
      };
      worker.onerror = () => {
        window.clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        reject(new Error('Die Suchausführung konnte nicht geladen werden'));
      };
      worker.postMessage(request);
    });
  } finally {
    worker.terminate();
  }
}

export async function searchEpisodes(query: string, signal: AbortSignal): Promise<SearchSession> {
  const terms = [...new Set(query.normalize('NFC').toLocaleLowerCase('de-DE').trim().split(/\s+/).filter(Boolean))].sort();
  const index = await loadIndex(AbortSignal.any([signal, AbortSignal.timeout(20000)]));
  const initial = await loadPage({ ...index, terms, offset: 0 }, signal);
  let offset = initial.results.length;
  return {
    initial,
    async loadMore() {
      const page = await loadPage({ ...index, terms, offset }, signal);
      offset += page.results.length;
      return page;
    },
  };
}

export async function loadEpisode(episodeId: string, signal: AbortSignal) {
  const index = await loadIndex(signal);
  const identity = Object.values(index.episodes).find((item) => item.episodeId === episodeId);
  if (!identity) return undefined;
  const response = await fetch(new URL(`episodes/${encodeURIComponent(episodeId)}.json`, index.moduleUrl), { signal });
  if (!response.ok) throw new Error(`Folge nicht erreichbar (${response.status})`);
  const episode = await response.json();
  if (episode.episode_id !== identity.episodeId || episode.published_at !== identity.publishedAt) {
    throw new Error('Suchindex und Folgendetails stimmen nicht überein');
  }
  return episode as {
    episode_id: string; title: string; published_at: string; audio: { url: string; duration_seconds: number };
    webpage_url?: string; source: { reference_url: string };
    segments: (Segment & { token_points?: { text: string; at_seconds: number }[] })[];
  };
}
