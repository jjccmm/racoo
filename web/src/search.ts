import { loadPublication } from './publication';
import { loadPodcasts } from './podcasts';
import { parseQuery } from './query';

export type Segment = { id: string; text: string; start_seconds: number; end_seconds: number };
export type Highlight = { start: number; end: number; terms: string[] };
export type Passage = Segment & { terms: string[]; highlights: Highlight[] };
export type Identity = { episodeId: string; publishedAt: string };
type SearchIndex = { publicationId: string; moduleUrl: string; episodes: Record<string, Identity> };
export type SearchRequest = SearchIndex & { terms: string[]; offset: number; targetEpisodeIds?: string[]; mode?: 'counts' | 'forms' | 'exact' };
export type SearchResult = Identity & {
  segments: Segment[];
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
export type SearchOverview = {
  publicationId: string; terms: string[]; total: number;
  episodes: (Identity & { counts: Record<string, number>; uniqueCount: number })[];
};
export type WordVariant = { word: string; count: number };
export type TopDetails = { variants: Record<string, WordVariant[]>; results: SearchResult[]; overview?: SearchOverview };
export type SearchPage = { results: SearchResult[]; total: number; terms: string[] };
export type SearchSession = { initial: SearchPage; loadMore(): Promise<SearchPage> };

const base = import.meta.env.BASE_URL;

async function json(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Datei nicht erreichbar (${response.status})`);
  return response.json();
}

let cachedIndex: { key: string; value: SearchIndex } | undefined;
async function loadIndex(signal: AbortSignal, dataBase?: string, expectedPublicationId?: string): Promise<SearchIndex> {
  if (dataBase === undefined) {
    const podcasts = await loadPodcasts(signal);
    const params = new URLSearchParams(window.location.search);
    const podcast = params.has('podcast') ? podcasts.find(item => item.id === params.get('podcast'))
      : podcasts.find(item => item.episodeIds.includes(params.get('episode') ?? '')) ?? podcasts[0];
    if (!podcast || !podcast.episodeCount) throw new Error('Für diesen Podcast ist kein Suchstand verfügbar');
    dataBase = `${base}${podcast.dataPath}`;
  }
  signal.throwIfAborted();
  const key = new URL(dataBase, location.href).href;
  if (cachedIndex?.key === key && (!expectedPublicationId || cachedIndex.value.publicationId === expectedPublicationId)) return cachedIndex.value;
  const publication = await loadPublication(signal, dataBase);
  if (expectedPublicationId && publication.publicationId !== expectedPublicationId) throw new Error('Der Datenstand hat sich geändert. Bitte lade die Seite neu.');
  const manifest = await json(`${dataBase}search/manifest.json`, signal);
  if (!/^[a-f0-9]{64}$/.test(manifest.indexId) || manifest.publicationId !== publication.publicationId
      || manifest.indexId !== publication.searchIndexId || manifest.podcastId !== publication.podcastId) throw new Error('Ungültiger Suchstand');
  const directory = `${dataBase}search/${manifest.indexId}/`;
  const mapping = await json(`${directory}episodes.json`, signal);
  if (mapping.indexId !== manifest.indexId || mapping.publicationId !== publication.publicationId) throw new Error('Suchindex und Folgenzuordnung stimmen nicht überein');
  const moduleUrl = new URL(`${directory}pagefind.js`, window.location.href).href;
  const value = { publicationId: publication.publicationId, moduleUrl, episodes: mapping.episodes };
  cachedIndex = { key, value };
  return value;
}

type Pending = { resolve(value: unknown): void; reject(error: Error): void; cleanup(): void };
class SearchWorker {
  worker = new Worker(new URL('./search-worker.ts', import.meta.url), { type: 'module' });
  pending = new Map<number, Pending>();
  sequence = 0;
  constructor(readonly key: string) {
    this.worker.onmessage = (event: MessageEvent<{ requestId: number; value?: unknown; error?: string }>) => {
      const request = this.pending.get(event.data.requestId);
      if (!request) return;
      if (event.data.error) { this.dispose(new Error(event.data.error)); return; }
      this.pending.delete(event.data.requestId); request.cleanup(); request.resolve(event.data.value);
    };
    this.worker.onerror = () => this.dispose(new Error('Die Suchausführung konnte nicht geladen werden'));
  }
  dispose(error = new Error('Die Suche wurde beendet')) {
    this.worker.terminate();
    for (const request of this.pending.values()) { request.cleanup(); request.reject(error); }
    this.pending.clear();
    if (cachedIndex?.value.moduleUrl === this.key) cachedIndex = undefined;
    if (activeWorker === this) activeWorker = undefined;
  }
  call<T>(request: SearchRequest, signal: AbortSignal): Promise<T> {
    signal.throwIfAborted();
    return new Promise<T>((resolve, reject) => {
      const id = ++this.sequence;
      const abort = () => {
        this.pending.get(id)?.cleanup(); this.pending.delete(id); reject(signal.reason);
        if (!this.pending.size) this.dispose();
      };
      const timeout = window.setTimeout(() => this.dispose(new Error('Zeitlimit der Suche überschritten')), 20000);
      this.pending.set(id, { resolve: value => resolve(value as T), reject,
        cleanup: () => { clearTimeout(timeout); signal.removeEventListener('abort', abort); } });
      signal.addEventListener('abort', abort, { once: true });
      this.worker.postMessage({ ...request, requestId: id });
    });
  }
}
let activeWorker: SearchWorker | undefined;
async function loadPage<T = SearchPage>(request: SearchRequest, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  if (activeWorker?.key !== request.moduleUrl) { activeWorker?.dispose(); activeWorker = new SearchWorker(request.moduleUrl); }
  return activeWorker!.call<T>(request, signal);
}

/** Complete per-term counts before any result fragment or transcript is loaded. */
export async function countEpisodes(terms: string[], signal: AbortSignal, dataBase: string, publicationId?: string): Promise<SearchOverview> {
  const index = await loadIndex(signal, dataBase, publicationId);
  return loadPage<SearchOverview>({ ...index, terms: parseQuery(terms.join(' ')).terms, offset: 0, mode: 'counts' }, signal);
}

/** Inspect only the fixed standard top ten; never expands the candidate set. */
export async function inspectTopEpisodes(terms: string[], episodeIds: string[], kind: 'forms' | 'exact', signal: AbortSignal, dataBase: string, publicationId: string): Promise<TopDetails> {
  if (episodeIds.length > 10 || new Set(episodeIds).size !== episodeIds.length) throw new Error('Ungültige Top10-Auswahl');
  const index = await loadIndex(signal, dataBase, publicationId);
  return loadPage<TopDetails>({ ...index, terms: parseQuery(terms.join(' ')).terms, targetEpisodeIds: episodeIds, offset: 0, mode: kind }, signal);
}

export async function searchEpisodes(query: string, signal: AbortSignal, options: { targetEpisodeIds?: string[]; dataBase?: string; publicationId?: string } = {}): Promise<SearchSession> {
  const terms = parseQuery(query).terms.sort();
  const index = await loadIndex(AbortSignal.any([signal, AbortSignal.timeout(20000)]), options.dataBase, options.publicationId);
  const initial = await loadPage({ ...index, ...options, terms, offset: 0 }, signal);
  let offset = initial.results.length;
  return {
    initial,
    async loadMore() {
      const page = await loadPage({ ...index, ...options, terms, offset }, signal);
      offset += page.results.length;
      return page;
    },
  };
}

export async function loadEpisode(episodeId: string, signal: AbortSignal, dataBase?: string) {
  const index = await loadIndex(signal, dataBase);
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
    segments: Segment[];
  };
}
