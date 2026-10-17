import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { searchIndex } from './build/search-index.ts';

export default defineConfig({ plugins: [react(), searchIndex()] });
