import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  root: path.resolve('src/renderer'),
  base: './',
  build: {
    outDir: path.resolve('dist'),
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
