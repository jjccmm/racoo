import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { ResolvedConfig } from 'vite';

type BuildInputs = { source?: string; episodes: string; analyses: string };
const selected = new WeakMap<ResolvedConfig, BuildInputs>();

/** All build outputs consume one selection; the normal selection is the saved real pilot. */
export function buildInputs(config: ResolvedConfig): BuildInputs {
  const existing = selected.get(config);
  if (existing) return existing;
  const root = path.resolve(config.root, '..');
  const sourceSetting = process.env.PODCAST_WORDS_PUBLICATION_SOURCE;
  const episodesSetting = process.env.PODCAST_WORDS_EPISODES;
  if (sourceSetting && episodesSetting) {
    throw new Error('Choose either PODCAST_WORDS_PUBLICATION_SOURCE or PODCAST_WORDS_EPISODES');
  }
  let source = sourceSetting ? path.resolve(root, sourceSetting) : undefined;
  if (!source && !episodesSetting) {
    source = path.join(root, '.cache/pilot-publication');
    const result = spawnSync('uv', ['run', '--frozen', '--no-sync', 'podcast-words', 'publish',
      '--catalog', path.join(root, 'data/podcast-ufo/catalog.json'),
      '--episodes', path.join(root, 'data/podcast-ufo/pilot-episodes.json'),
      '--analyses', path.join(root, 'data/podcast-ufo/analyses'),
      '--output', source, '--cache-only',
    ], {
      cwd: root, encoding: 'utf8',
      env: { ...process.env, UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? path.join(root, '.uv-cache') },
    });
    if (result.error || result.status !== 0) {
      throw new Error(`Cannot prepare the local pilot from saved transcripts and analyses. Run the documented process/analyze steps first. ${result.error ?? result.stdout + result.stderr}`);
    }
  }
  const inputs = {
    source,
    episodes: source ? path.join(source, 'episodes.json') : path.resolve(root, episodesSetting!),
    analyses: path.resolve(root, process.env.PODCAST_WORDS_ANALYSES ?? 'tests/fixtures/analysis'),
  };
  selected.set(config, inputs);
  return inputs;
}
