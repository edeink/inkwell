import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@mindmap': path.resolve(__dirname, 'src/demo/mindmap'),
    },
  },
  test: {
    environment: 'jsdom',
    reporters: 'default',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 1000,
  },
});
