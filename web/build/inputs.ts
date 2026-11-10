import path from 'node:path';
import type { ResolvedConfig } from 'vite';

export type BuildInputs = { source?: string; episodes: string };
const selected = new WeakMap<ResolvedConfig, BuildInputs>();

/** Explicit single-publication inputs for fixtures and controlled source builds. */
export function buildInputs(config: ResolvedConfig): BuildInputs {
  const existing = selected.get(config);
  if (existing) return existing;
  const root = path.resolve(config.root, '..');
  const sourceSetting = process.env.PODCAST_WORDS_PUBLICATION_SOURCE;
  const episodesSetting = process.env.PODCAST_WORDS_EPISODES;
  if (sourceSetting && episodesSetting) {
    throw new Error('Choose either PODCAST_WORDS_PUBLICATION_SOURCE or PODCAST_WORDS_EPISODES');
  }
  const source = sourceSetting ? path.resolve(root, sourceSetting) : undefined;
  if (!source && !episodesSetting) throw new Error('Explicit corpus or source required for a single publication');
  const inputs = {
    source,
    episodes: source ? path.join(source, 'episodes.json') : path.resolve(root, episodesSetting!),
  };
  selected.set(config, inputs);
  return inputs;
}
