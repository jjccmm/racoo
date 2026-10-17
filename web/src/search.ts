export type Segment = { id: string; text: string; start_seconds: number; end_seconds: number };
export type Identity = { episodeId: string; publishedAt: string };
export type SearchRequest = { moduleUrl: string; episodes: Record<string, Identity>; term: string };
export type SearchResult = Identity & {
  searchId: string;
  title: string;
  term: string;
  positions: number[];
  passages: Segment[];
};

const base = import.meta.env.BASE_URL;

async function json(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Datei nicht erreichbar (${response.status})`);
  return response.json();
}

async function loadIndex(): Promise<Omit<SearchRequest, 'term'>> {
  const manifest = await json(`${base}search/manifest.json`);
  if (!/^[a-f0-9]{64}$/.test(manifest.indexId)) throw new Error('Ungültiger Suchstand');
  const directory = `${base}search/${manifest.indexId}/`;
  const mapping = await json(`${directory}episodes.json`);
  if (mapping.indexId !== manifest.indexId) throw new Error('Suchindex und Folgenzuordnung stimmen nicht überein');
  const moduleUrl = new URL(`${directory}pagefind.js`, window.location.href).href;
  return { moduleUrl, episodes: mapping.episodes };
}

export async function searchEpisode(term: string): Promise<SearchResult[]> {
  const index = await loadIndex();
  // A fresh worker isolates Pagefind's mutable cache and its fetch handling.
  // A deliberate retry starts fresh after a failed chunk instead of reusing a
  // cached failed load. The worker never changes the page's fetch function.
  const worker = new Worker(new URL('./search-worker.ts', import.meta.url), { type: 'module' });
  try {
    return await new Promise<SearchResult[]>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Zeitlimit der Suche überschritten')), 20000);
      worker.onmessage = (event: MessageEvent<{ results?: SearchResult[]; error?: string }>) => {
        window.clearTimeout(timeout);
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.results!);
      };
      worker.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Die Suchausführung konnte nicht geladen werden'));
      };
      worker.postMessage({ ...index, term } satisfies SearchRequest);
    });
  } finally {
    worker.terminate();
  }
}
