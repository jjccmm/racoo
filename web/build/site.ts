import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Plugin, ResolvedConfig } from 'vite';
import { buildInputs } from './inputs.ts';
import { writeSearchIndex } from './search-index.ts';
import { writeStatistics } from './statistics.ts';
import { writePublication, checkArtifactBudget } from './publication.ts';

type Podcast = { id: string; name: string; speakers: string[]; cover: string; dataPath: string;
  knownEpisodeCount: number; episodeCount: number; lastCheckedAt: string | null; episodeIds: string[]; source?: string | null };

export function podcastSite(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'racoo-podcast-site', apply: 'build',
    configResolved(value) { config = value; },
    async closeBundle() {
      const root = path.resolve(config.root, '..');
      const dist = path.resolve(config.root, config.build.outDir);
      const legacy = !!(process.env.PODCAST_WORDS_EPISODES || process.env.PODCAST_WORDS_PUBLICATION_SOURCE);
      let podcasts: Podcast[];
      if (legacy) {
        const inputs = buildInputs(config);
        await writeSearchIndex(config, inputs, dist);
        await writeStatistics(config, inputs, dist);
        await writePublication(config, inputs, dist);
        const publication = JSON.parse(await readFile(path.join(dist, 'publication.json'), 'utf8'));
        podcasts = [{ id: 'podcast-ufo', name: 'DAS PODCAST UFO', speakers: ['Florentin Will', 'Stefan Titze'],
          cover: 'images/podcast-ufo.jpg', dataPath: '', knownEpisodeCount: publication.episodeCount,
          episodeCount: publication.episodeCount, lastCheckedAt: null, episodeIds: publication.episodeIds }];
      } else {
        const output = path.join(root, '.cache/site-publication');
        const result = spawnSync('uv', ['run', '--frozen', '--no-sync', 'podcast-words', 'prepare-site',
          '--config', path.resolve(root, process.env.PODCAST_WORDS_CONFIG ?? 'podcasts.json'), '--output', output],
          { cwd: root, encoding: 'utf8', env: { ...process.env, UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? path.join(root, '.uv-cache') } });
        if (result.error || result.status !== 0) throw new Error(`Cannot prepare configured podcasts: ${result.error ?? result.stdout + result.stderr}`);
        const prepared = JSON.parse(await readFile(path.join(output, 'sources.json'), 'utf8')) as { syntheticFixture: boolean; podcasts: Podcast[] };
        podcasts = prepared.podcasts;
        for (const podcast of podcasts) {
          await access(path.join(dist, podcast.cover));
          if (!podcast.source) continue;
          const directory = path.join(dist, podcast.dataPath);
          await mkdir(directory, { recursive: true });
          const inputs = { source: podcast.source, episodes: path.join(podcast.source, 'episodes.json'), analyses: '' };
          await writeSearchIndex(config, inputs, directory);
          await writeStatistics(config, inputs, directory);
          await writePublication(config, inputs, directory);
        }
        await writeFile(path.join(dist, 'publication.json'), JSON.stringify({ schemaVersion: 2,
          state: prepared.syntheticFixture ? 'synthetic-fixture' : 'published-corpus', episodeCount: podcasts.reduce((sum, item) => sum + item.episodeCount, 0),
          podcastCount: podcasts.length }));
      }
      // Publish display/status metadata only; private build paths stay out of dist.
      await writeFile(path.join(dist, 'podcasts.json'), JSON.stringify({ schemaVersion: 1,
        podcasts: podcasts.map(podcast => ({ id: podcast.id, name: podcast.name, speakers: podcast.speakers, cover: podcast.cover, dataPath: podcast.dataPath, knownEpisodeCount: podcast.knownEpisodeCount, episodeCount: podcast.episodeCount, lastCheckedAt: podcast.lastCheckedAt, episodeIds: podcast.episodeIds })) }));
      await checkArtifactBudget(dist);
    },
  };
}
