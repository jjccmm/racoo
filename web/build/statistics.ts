import path from 'node:path';
import { cp, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import type { ResolvedConfig } from 'vite';
import type { BuildInputs } from './inputs.ts';

export async function writeStatistics(config: ResolvedConfig, inputs: BuildInputs, dist: string) {
  const root = path.resolve(config.root, '..');
  const destination = path.join(dist, 'stats');
  if (inputs.source) {
    await mkdir(destination, { recursive: true });
    await cp(path.join(inputs.source, 'stats'), destination, { recursive: true });
    console.log('Validated saved analyses reused from the selected publication source');
    return;
  }
  const result = spawnSync('uv', ['run', '--frozen', '--no-sync', 'podcast-words', 'analyze',
    '--episodes', inputs.episodes,
    '--output', inputs.analyses,
    '--cache-only', '--publish', path.join(dist, 'stats'),
  ], {
    cwd: root, encoding: 'utf8',
    env: { ...process.env, UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? path.join(root, '.uv-cache') },
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Invalid statistics inputs: ${result.error ?? result.stdout + result.stderr}`);
  }
  console.log('Exact lemma statistics published from validated saved analyses (no model loaded)');
}
