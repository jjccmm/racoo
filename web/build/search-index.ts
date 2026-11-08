import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import * as pagefind from 'pagefind';
import type { ResolvedConfig } from 'vite';
import type { BuildInputs } from './inputs.ts';

type Episode = {
  podcast_id: string;
  episode_id: string;
  published_at: string;
  title: string;
  segments: { id: string; text: string; start_seconds: number; end_seconds: number }[];
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

function checked<T extends { errors: string[] }>(result: T): T {
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  return result;
}

export async function writeSearchIndex(config: ResolvedConfig, inputs: BuildInputs, dist: string) {
  const root = path.resolve(config.root, '..');
  const corpusPath = inputs.episodes;
  const corpus: string[] = JSON.parse(await readFile(corpusPath, 'utf8'));
  const episodePaths = corpus.map((file) => path.resolve(path.dirname(corpusPath), file));
  if (!episodePaths.length) throw new Error('The search corpus must contain episodes');
  // Python remains authoritative, including semantic time and identity checks.
  const validation = spawnSync('uv', [
    'run', '--frozen', '--no-sync', 'podcast-words', 'validate-corpus', '--compatible-processing', '--episodes', corpusPath,
  ], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? path.join(root, '.uv-cache') },
  });
  if (validation.error || validation.status !== 0) {
    throw new Error(`Invalid search input: ${validation.error ?? validation.stdout + validation.stderr}`);
  }
  const episodes: Episode[] = await Promise.all(episodePaths.map(async (file) => JSON.parse(await readFile(file, 'utf8'))));
  if (new Set(episodes.map((episode) => episode.podcast_id)).size !== 1) {
    throw new Error('Build one podcast search index at a time');
  }
  if (new Set(episodes.map((episode) => episode.episode_id)).size !== episodes.length) {
    throw new Error('Duplicate stable episode identity in search corpus');
  }
  try {
    const { index } = checked(await pagefind.createIndex());
    if (!index) throw new Error('Pagefind did not create an index');
    for (const episode of episodes) {
      const paragraphs = episode.segments.map((segment) =>
        `<p id="${segment.id}">${escapeHtml(segment.text)}</p>`,
      ).join('');
      checked(await index.addHTMLFile({
        url: `${config.base}?episode=${encodeURIComponent(episode.episode_id)}`,
        // Pagefind 1.5.2 also searches metadata. Keep all display metadata
        // and original records in separate lazy files, outside this index.
        content: `<html lang="de"><head></head><body><main data-pagefind-body>${paragraphs}</main></body></html>`,
      }));
    }
    const { files } = checked(await index.getFiles());
    const digest = createHash('sha256');
    for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
      digest.update(file.path).update(file.content);
    }
    const records = episodes.map((episode) => ({
      path: `episodes/${episode.episode_id}.json`, content: JSON.stringify(episode),
    })).sort((a, b) => a.path.localeCompare(b.path));
    for (const record of records) digest.update(record.path).update(record.content);
    const indexId = digest.digest('hex');
    const directory = path.join(dist, 'search', indexId);
    const identities: Record<string, { episodeId: string; publishedAt: string }> = {};
    for (const file of files) {
      const output = path.join(directory, file.path);
      await mkdir(path.dirname(output), { recursive: true });
      await writeFile(output, file.content);
      const fragmentId = /^fragment\/(.+)\.pf_fragment$/.exec(file.path)?.[1];
      if (fragmentId) {
        // Version-specific build adapter for pinned Pagefind 1.5.2. Its public
        // Node API exposes files, but not the search IDs in addHTMLFile().
        const bytes = gunzipSync(file.content);
        if (bytes.subarray(0, 12).toString() !== 'pagefind_dcd') throw new Error('Unknown Pagefind fragment format');
        const fragment = JSON.parse(bytes.subarray(12).toString());
        const episodeId = new URL(fragment.url, 'https://search.invalid').searchParams.get('episode');
        const episode = episodes.find((candidate) => candidate.episode_id === episodeId);
        if (!episode) throw new Error('Unmapped Pagefind fragment');
        identities[fragmentId] = { episodeId: episode.episode_id, publishedAt: episode.published_at };
      }
    }
    if (Object.keys(identities).length !== episodes.length) throw new Error('Pagefind did not index every episode');
    await mkdir(path.join(directory, 'episodes'), { recursive: true });
    for (const record of records) await writeFile(path.join(directory, record.path), record.content);
    await writeFile(path.join(directory, 'episodes.json'), JSON.stringify({ indexId, episodes: identities }));
    await writeFile(path.join(directory, '..', 'manifest.json'), JSON.stringify({ indexId, podcastId: episodes[0].podcast_id }));
    console.log(`Pagefind 1.5.2: ${episodes.length} German episode documents, index ${indexId.slice(0, 12)}`);
  } finally {
    await pagefind.close();
  }
}
