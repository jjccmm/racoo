import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ResolvedConfig } from 'vite';
import type { BuildInputs } from './inputs.ts';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const json = async <T,>(file: string): Promise<T> => JSON.parse(await readFile(file, 'utf8')) as T;
type Episode = { episode_id: string; podcast_id: string; title: string; published_at: string; audio: { duration_seconds: number }; timings?: { download_seconds: number; transcription_seconds: number; total_seconds: number } };
type Entry = { episodeId: string; title: string; publishedAt: string; durationSeconds?: number; timings?: unknown };
type Catalog = { schemaVersion: number; podcastId: string; episodes: Entry[] };

async function treeSize(directory: string): Promise<number> {
  let total = 0;
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    total += item.isDirectory() ? await treeSize(file) : (await stat(file)).size;
  }
  return total;
}

export async function writePublication(_config: ResolvedConfig, inputs: BuildInputs, dist: string) {
  const searchDirectory = path.join(dist, 'search');
  const search = await json<{ indexId: string; podcastId: string; publicationId?: string }>(path.join(searchDirectory, 'manifest.json'));
  const mappingPath = path.join(searchDirectory, search.indexId, 'episodes.json');
  const mapping = await json<{ indexId: string; publicationId?: string; episodes: Record<string, { episodeId: string; publishedAt: string }> }>(mappingPath);
  const ids = Object.values(mapping.episodes).map(item => item.episodeId).sort();
  if (!/^[a-f0-9]{64}$/.test(search.indexId) || mapping.indexId !== search.indexId || !ids.length || new Set(ids).size !== ids.length) throw new Error('Invalid search identity mapping');
  const records = await Promise.all(ids.map(id => json<Episode>(path.join(searchDirectory, search.indexId, 'episodes', `${id}.json`))));
  const metadata = records.map(episode => ({ episodeId: episode.episode_id, title: episode.title, publishedAt: episode.published_at,
    durationSeconds: episode.audio.duration_seconds, timings: episode.timings ? { downloadSeconds: episode.timings.download_seconds, transcriptionSeconds: episode.timings.transcription_seconds, totalSeconds: episode.timings.total_seconds } : undefined }));
  const catalog: Catalog = inputs.source ? await json<Catalog>(path.join(inputs.source, 'catalog.json'))
    : { schemaVersion: 2, podcastId: search.podcastId, episodes: metadata };
  const canonical = (entries: Entry[]) => entries.map(item => ({ ...item, publishedAt: new Date(item.publishedAt).toISOString() })).sort((a, b) => a.episodeId.localeCompare(b.episodeId));
  if (catalog.schemaVersion !== 2 || catalog.podcastId !== search.podcastId
    || JSON.stringify(canonical(catalog.episodes.map(({ episodeId, title, publishedAt, durationSeconds, timings }) => ({ episodeId, title, publishedAt, durationSeconds, timings })))) !== JSON.stringify(canonical(metadata))) throw new Error('Search transcripts and metadata catalog do not match');
  const prepared = inputs.source ? await json<{ schemaVersion: number; generatedBy: string; preparationId: string; podcastId: string; state: string; episodeIds: string[] }>(path.join(inputs.source, 'manifest.json')) : undefined;
  if (prepared && (prepared.schemaVersion !== 2 || prepared.generatedBy !== 'podcast-words publish' || prepared.podcastId !== search.podcastId || prepared.state !== 'published-corpus' || JSON.stringify([...prepared.episodeIds].sort()) !== JSON.stringify(ids))) throw new Error('Invalid prepared publication source');
  const catalogId = digest(catalog);
  const state = prepared ? 'published-corpus' : 'synthetic-fixture';
  const publicationId = digest({ schemaVersion: 3, podcastId: search.podcastId, state, searchIndexId: search.indexId, catalogId, preparationId: prepared?.preparationId ?? null });
  search.publicationId = mapping.publicationId = publicationId;
  await writeFile(path.join(searchDirectory, 'manifest.json'), JSON.stringify(search));
  await writeFile(mappingPath, JSON.stringify(mapping));
  await writeFile(path.join(dist, 'catalog.json'), JSON.stringify({ ...catalog, publicationId, catalogId }));
  await writeFile(path.join(dist, 'publication.json'), JSON.stringify({ schemaVersion: 3, publicationId, podcastId: search.podcastId,
    state, archiveComplete: false, episodeCount: ids.length, episodeIds: ids, searchIndexId: search.indexId,
    catalogId, preparationId: prepared?.preparationId ?? null }));
  console.log(`Publication ${publicationId.slice(0, 12)}: ${ids.length} episodes, Pagefind only`);
}

export async function checkArtifactBudget(dist: string) {
  const size = await treeSize(dist);
  const warning = Number(process.env.PODCAST_WORDS_ARTIFACT_WARNING_BYTES ?? 800_000_000);
  const maximum = Number(process.env.PODCAST_WORDS_ARTIFACT_MAX_BYTES ?? 1_000_000_000);
  if (!Number.isSafeInteger(warning) || !Number.isSafeInteger(maximum) || warning <= 0 || warning > 800_000_000 || maximum <= warning || maximum > 1_000_000_000) throw new Error('Invalid artifact size budgets');
  if (size > maximum) throw new Error(`Static publication exceeds ${maximum} byte limit (${size} bytes)`);
  if (size > warning) console.warn(`Static publication is ${size} bytes; review the ${warning} byte warning budget`);
  console.log(`Static site: ${size} bytes`);
}
