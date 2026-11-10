import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { podcastSite } from './build/site.ts';

export default defineConfig({
  plugins: [react(), podcastSite(), {
    name: 'public-search-session-api',
    apply: 'build',
    config(config) {
      const root = path.resolve(config.root ?? '.');
      if (!existsSync(path.join(root, 'src/search.ts'))) return;
      return { build: {
        manifest: true,
        // The independent search/session interface supports lexical coverage probes
        // and tools without adding another field to the lemma explorer.
        rolldownOptions: { preserveEntrySignatures: 'strict', input: { app: path.join(root, 'index.html'), search: path.join(root, 'src/search.ts') } },
      } };
    },
  }],
});

