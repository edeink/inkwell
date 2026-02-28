import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: process.cwd(),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
      '@demo': path.resolve(process.cwd(), 'src/demo'),
      '@mindmap': path.resolve(process.cwd(), 'src/demo/mindmap'),
      '@spreadsheet': path.resolve(process.cwd(), 'src/demo/spreadsheet'),
      'wiki-app': path.resolve(process.cwd(), 'src/demo/wiki/app.tsx'),
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  build: {
    outDir: 'dist-debug',
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), 'debug-devtools.html'),
      },
    },
    sourcemap: true,
    minify: true,
  },
  esbuild: {
    keepNames: true,
  },
});
