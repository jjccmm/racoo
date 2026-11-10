import { loadPublication } from './publication';

export type EpisodeMetadata = {
  episodeId: string; title: string; publishedAt: string; durationSeconds?: number;
  timings?: { downloadSeconds: number; transcriptionSeconds: number; totalSeconds: number };
};
export type SearchData = { publicationId: string; episodes: EpisodeMetadata[]; excluded: string[] };
export async function loadSearchData(dataBase: string, signal: AbortSignal): Promise<SearchData> {
  const publication = await loadPublication(signal, dataBase);
  const read = async (file: string) => {
    const response = await fetch(`${dataBase}${file}`, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const value = await response.json();
    if (value.publicationId !== publication.publicationId) throw new Error('Dateien gehören zu unterschiedlichen Veröffentlichungen');
    return value;
  };
  const [catalog, rules] = await Promise.all([read('catalog.json'), read('search-rules.json')]);
  if (catalog.schemaVersion !== 2 || catalog.catalogId !== publication.catalogId || catalog.podcastId !== publication.podcastId
    || !Array.isArray(catalog.episodes) || catalog.episodes.length !== publication.episodeCount
    || rules.schemaVersion !== 1 || rules.searchRulesId !== publication.searchRulesId
    || !Array.isArray(rules.stopwords) || !Array.isArray(rules.ignoredWords)
    || [...rules.stopwords, ...rules.ignoredWords].some(word => typeof word !== 'string')) throw new Error('Ungültiger Suchkatalog');
  const seen = new Set<string>();
  for (const episode of catalog.episodes) {
    if (!episode || !publication.episodeIds.includes(episode.episodeId) || seen.has(episode.episodeId)
      || typeof episode.title !== 'string' || !Number.isFinite(Date.parse(episode.publishedAt))
      || (episode.durationSeconds !== undefined && !measured(episode.durationSeconds))
      || (episode.timings !== undefined && (!episode.timings || !['downloadSeconds', 'transcriptionSeconds', 'totalSeconds'].every(key => measured(episode.timings[key]))))) throw new Error('Ungültige Folgendaten');
    seen.add(episode.episodeId);
  }
  return { publicationId: publication.publicationId, episodes: catalog.episodes, excluded: [...new Set<string>([...rules.stopwords, ...rules.ignoredWords])] };
}
function measured(value: unknown) { return typeof value === 'number' && Number.isFinite(value) && value >= 0; }
