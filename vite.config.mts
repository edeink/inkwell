/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'wiki-app': fileURLToPath(new URL('./src/demo/wiki/app.tsx', import.meta.url)),
    },
  },
  esbuild: {
    keepNames: true,
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
  test: {
    watch: false,
    environment: 'jsdom',
    setupFiles: [],
  },
})
