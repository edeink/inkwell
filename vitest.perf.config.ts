import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.mts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      testTimeout: 1000, // Enforce 1 second timeout per test
      include: [
        'src/benchmark/metrics/__tests__/dom.spec.ts',
        'src/benchmark/tester/pipeline/__tests__/pipeline.spec.ts',
        'src/benchmark/perf.spec.tsx',
      ],
    },
  }),
);
