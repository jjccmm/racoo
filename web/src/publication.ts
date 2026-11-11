export type Publication = {
  schemaVersion: 3; publicationId: string; podcastId: string;
  state: 'published-corpus' | 'synthetic-fixture'; archiveComplete: false;
  episodeCount: number; episodeIds: string[]; searchIndexId: string;
  catalogId: string; preparationId: string | null;
};

export async function loadPublication(signal?: AbortSignal, dataBase = import.meta.env.BASE_URL): Promise<Publication> {
  const response = await fetch(`${dataBase}publication.json`, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const value = await response.json();
  if (value.schemaVersion !== 3 || !/^[a-f0-9]{64}$/.test(value.publicationId)
      || typeof value.podcastId !== 'string' || !['published-corpus', 'synthetic-fixture'].includes(value.state)
      || value.archiveComplete !== false || !Array.isArray(value.episodeIds)
      || value.episodeIds.some((id: unknown) => typeof id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(id)) || new Set(value.episodeIds).size !== value.episodeIds.length
      || !Number.isSafeInteger(value.episodeCount) || value.episodeCount !== value.episodeIds.length
      || !/^[a-f0-9]{64}$/.test(value.searchIndexId) || !/^[a-f0-9]{64}$/.test(value.catalogId)) {
    throw new Error('Invalid publication identity');
  }
  return value as Publication;
}
