export type Publication = {
  schemaVersion: 1; publicationId: string; podcastId: string;
  state: 'selected-pilot' | 'synthetic-fixture'; archiveComplete: false;
  episodeCount: number; episodeIds: string[]; searchIndexId: string;
  statisticsId: string; preparationId: string | null;
};

export async function loadPublication(signal?: AbortSignal, dataBase = import.meta.env.BASE_URL): Promise<Publication> {
  const response = await fetch(`${dataBase}publication.json`, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const value = await response.json();
  if (value.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(value.publicationId)
      || typeof value.podcastId !== 'string' || !['selected-pilot', 'synthetic-fixture'].includes(value.state)
      || value.archiveComplete !== false || !Array.isArray(value.episodeIds)
      || !Number.isSafeInteger(value.episodeCount) || value.episodeCount !== value.episodeIds.length
      || !/^[a-f0-9]{64}$/.test(value.searchIndexId) || !/^[a-f0-9]{64}$/.test(value.statisticsId)) {
    throw new Error('Invalid publication identity');
  }
  return value as Publication;
}
