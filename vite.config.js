import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

export default defineConfig({
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
});
