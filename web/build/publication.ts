import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const json = async <T,>(file: string): Promise<T> => JSON.parse(await readFile(file, 'utf8')) as T;
type EpisodeRecord = { episode_id: string; title: string; published_at: string; webpage_url?: string | null; source?: { reference_url?: string | null }; audio: unknown };
type StatEpisode = { episodeId: string; title: string; publishedAt: string };
type SearchMap = { indexId: string; publicationId?: string; episodes: Record<string, { episodeId: string; publishedAt: string }> };
type JsonObject = Record<string, unknown>;

async function treeSize(directory: string): Promise<number> {
  let total = 0;
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) total += await treeSize(file);
    else total += (await stat(file)).size;
  }
  return total;
}

export function publication(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'podcast-words-publication-envelope',
    apply: 'build',
    configResolved(resolved) { config = resolved; },
    async closeBundle() {
      const root = path.resolve(config.root, '..');
      const dist = path.resolve(config.root, config.build.outDir);
      const source = process.env.PODCAST_WORDS_PUBLICATION_SOURCE
        ? path.resolve(root, process.env.PODCAST_WORDS_PUBLICATION_SOURCE) : undefined;
      const prepared = source ? await json<JsonObject & { podcastId: string; state: string; archiveComplete: boolean; episodeIds: string[]; preparationId: string }>(path.join(source, 'manifest.json')) : undefined;
      const publicCatalog = source ? await json<JsonObject & { podcastId: string; episodes: { episodeId: string }[] }>(path.join(source, 'catalog.json')) : undefined;
      const search = path.join(dist, 'search');
      const stats = path.join(dist, 'stats');
      const searchManifest = await json<{ indexId: string; podcastId: string; publicationId?: string }>(path.join(search, 'manifest.json'));
      const searchMapPath = path.join(search, searchManifest.indexId, 'episodes.json');
      const searchMap = await json<SearchMap>(searchMapPath);
      const statsManifestPath = path.join(stats, 'manifest.json');
      const statsManifest = await json<{ publicationId: string; podcastId: string }>(statsManifestPath);
      const statsCatalogPath = path.join(stats, 'catalog.json');
      const statsCatalog = await json<{ publicationId: string; episodes: StatEpisode[] }>(statsCatalogPath);
      if (!/^[a-f0-9]{64}$/.test(searchManifest.indexId) || searchMap.indexId !== searchManifest.indexId) {
        throw new Error('Search index and stable episode mapping do not match');
      }
      if (!/^[a-f0-9]{64}$/.test(statsManifest.publicationId)
          || statsManifest.podcastId !== searchManifest.podcastId
          || statsCatalog.publicationId !== statsManifest.publicationId) {
        throw new Error('Search and statistics inputs belong to different publications');
      }
      const ids = Object.values(searchMap.episodes).map((item) => item.episodeId).sort();
      const statsIds = statsCatalog.episodes.map((item) => item.episodeId).sort();
      if (!ids.length || JSON.stringify(ids) !== JSON.stringify(statsIds)
          || new Set(ids).size !== ids.length) {
        throw new Error('Search and statistics episode selections do not match');
      }
      const records = await Promise.all(ids.map((id) => json<EpisodeRecord>(path.join(search, searchManifest.indexId, 'episodes', `${id}.json`))));
      const metadata = records.map((episode) => ({ episodeId: episode.episode_id, title: episode.title, publishedAt: new Date(episode.published_at).toISOString() })).sort((a, b) => a.episodeId.localeCompare(b.episodeId));
      const analysisMetadata = statsCatalog.episodes.map((episode) => ({ episodeId: episode.episodeId, title: episode.title, publishedAt: new Date(episode.publishedAt).toISOString() })).sort((a, b) => a.episodeId.localeCompare(b.episodeId));
      if (JSON.stringify(metadata) !== JSON.stringify(analysisMetadata)) {
        throw new Error('Search transcript metadata and statistics catalog do not match');
      }
      if (prepared && (!publicCatalog || prepared.podcastId !== searchManifest.podcastId
          || prepared.state !== 'selected-pilot' || prepared.archiveComplete !== false
          || JSON.stringify([...prepared.episodeIds].sort()) !== JSON.stringify(ids)
          || publicCatalog.podcastId !== prepared.podcastId
          || JSON.stringify(publicCatalog.episodes.map((item) => item.episodeId).sort()) !== JSON.stringify(ids))) {
        throw new Error('Publication source is incomplete or differs from built search/statistics inputs');
      }
      const statisticsId = statsManifest.publicationId;
      const publicationId = digest({
        schemaVersion: 1, podcastId: searchManifest.podcastId,
        state: prepared?.state ?? 'synthetic-fixture', archiveComplete: false,
        preparationId: prepared?.preparationId ?? null, searchIndexId: searchManifest.indexId,
        statisticsId, episodes: metadata, publicCatalog: publicCatalog ?? null,
      });
      searchManifest.publicationId = publicationId;
      searchMap.publicationId = publicationId;
      await writeFile(path.join(search, 'manifest.json'), JSON.stringify(searchManifest));
      await writeFile(searchMapPath, JSON.stringify(searchMap));
      for (const file of ['manifest.json', 'catalog.json', 'vocabulary.json', ...(await readdir(path.join(stats, 'counts'))).map((name) => `counts/${name}`)]) {
        const filePath = path.join(stats, file);
        const value = await json<JsonObject>(filePath);
        if (value.publicationId !== statisticsId) throw new Error(`Mixed statistics artifact: ${file}`);
        value.statisticsId = statisticsId;
        value.publicationId = publicationId;
        await writeFile(filePath, JSON.stringify(value));
      }
      const catalog = publicCatalog ?? {
        schemaVersion: 1, podcastId: searchManifest.podcastId,
        episodes: records.map((episode) => ({ episodeId: episode.episode_id, title: episode.title, publishedAt: episode.published_at, webpageUrl: episode.webpage_url ?? episode.source?.reference_url ?? null, audio: episode.audio })),
      };
      await writeFile(path.join(dist, 'catalog.json'), JSON.stringify({ ...catalog, publicationId }));
      await writeFile(path.join(dist, 'publication.json'), JSON.stringify({
        schemaVersion: 1, publicationId, podcastId: searchManifest.podcastId,
        state: prepared?.state ?? 'synthetic-fixture', archiveComplete: false,
        episodeCount: ids.length, episodeIds: ids, searchIndexId: searchManifest.indexId,
        statisticsId, preparationId: prepared?.preparationId ?? null,
      }));
      const size = await treeSize(dist);
      const warning = Number(process.env.PODCAST_WORDS_ARTIFACT_WARNING_BYTES ?? 800_000_000);
      const maximum = Number(process.env.PODCAST_WORDS_ARTIFACT_MAX_BYTES ?? 1_000_000_000);
      if (!Number.isSafeInteger(warning) || !Number.isSafeInteger(maximum) || warning <= 0
          || warning > 800_000_000 || maximum <= warning || maximum > 1_000_000_000) {
        throw new Error('Artifact size budgets may only lower the 800,000,000 byte warning and 1,000,000,000 byte maximum');
      }
      if (size > maximum) throw new Error(`Static publication exceeds ${maximum} byte limit (${size} bytes)`);
      if (size > warning) console.warn(`Static publication is ${size} bytes; review the ${warning} byte (800 MB default) warning budget`);
      console.log(`Publication ${publicationId.slice(0, 12)}: ${ids.length} selected episodes, ${size} bytes`);
    },
  };
}
