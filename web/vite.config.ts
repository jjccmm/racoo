import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { searchIndex } from './build/search-index.ts';
import { statistics } from './build/statistics.ts';
import { publication } from './build/publication.ts';

export default defineConfig({
  plugins: [react(), searchIndex(), statistics(), publication(), {
    name: 'public-search-session-api',
    apply: 'build',
    config(config) {
      const root = path.resolve(config.root ?? '.');
      if (!existsSync(path.join(root, 'src/search.ts'))) return;
      return { build: {
        manifest: true,
        // The independent search/session interface supports lexical coverage probes
        // and tools without adding another field to the lemma explorer.
        rolldownOptions: { input: { app: path.join(root, 'index.html'), search: path.join(root, 'src/search.ts') } },
      } };
    },
  }],
});
