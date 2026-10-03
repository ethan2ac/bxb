import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  // `npm run dev:frontend` gets hot reload while the API keeps running under
  // `wrangler pages dev` on 8788 — without this the SPA can't reach /api.
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
});
