import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` is '/' in dev so localhost works at the root, and the repo subpath
// in build so GitHub Pages can resolve assets at /beghou-app-specs/*.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/beghou-app-specs/' : '/',
  plugins: [react()],
  server: { port: 5173, open: true },
  build: { target: 'es2020' },
}));
