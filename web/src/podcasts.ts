export type Podcast = {
  id: string; name: string; speakers: string[]; cover: string; websiteUrl?: string | null; dataPath: string;
  knownEpisodeCount: number; episodeCount: number; lastCheckedAt: string | null; episodeIds: string[];
};

export async function loadPodcasts(signal: AbortSignal): Promise<Podcast[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}podcasts.json`, { signal });
  if (!response.ok) throw new Error(`Podcastübersicht nicht erreichbar (${response.status})`);
  const value = await response.json();
  if (value.schemaVersion !== 1 || !Array.isArray(value.podcasts) || !value.podcasts.length) throw new Error('Ungültige Podcastübersicht');
  const ids = new Set<string>();
  const episodes = new Set<string>();
  for (const podcast of value.podcasts) {
    if (!podcast || typeof podcast.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(podcast.id) || ids.has(podcast.id)
        || typeof podcast.name !== 'string' || !podcast.name.trim()
        || !Array.isArray(podcast.speakers) || !podcast.speakers.length || podcast.speakers.some((name: unknown) => typeof name !== 'string' || !name.trim())
        || typeof podcast.cover !== 'string' || !/^[a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+$/.test(podcast.cover) || podcast.cover.includes('..') || podcast.cover.startsWith('/')
        || (podcast.websiteUrl != null && !website(podcast.websiteUrl))
        || (podcast.dataPath !== '' && podcast.dataPath !== `podcasts/${podcast.id}/`)
        || !Number.isSafeInteger(podcast.knownEpisodeCount) || !Number.isSafeInteger(podcast.episodeCount)
        || podcast.episodeCount < 0 || podcast.knownEpisodeCount < podcast.episodeCount
        || !Array.isArray(podcast.episodeIds) || podcast.episodeIds.length !== podcast.episodeCount
        || (podcast.lastCheckedAt !== null && (typeof podcast.lastCheckedAt !== 'string' || !Number.isFinite(Date.parse(podcast.lastCheckedAt))))) throw new Error('Ungültige Podcastübersicht');
    ids.add(podcast.id);
    for (const id of podcast.episodeIds) {
      if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(id) || episodes.has(id)) throw new Error('Ungültige Folgenzuordnung');
      episodes.add(id);
    }
  }
  return value.podcasts;
}

function website(value: unknown) {
  if (typeof value !== 'string') return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}
