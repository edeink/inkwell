import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@mindmap': path.resolve(__dirname, 'src/demo/mindmap'),
      '@theme-original/CodeBlock': path.resolve(
        __dirname,
        'src/docusaurus/theme/CodeBlock/__tests__/stubs/OriginalCodeBlock.tsx',
      ),
      '@theme/Mermaid': path.resolve(
        __dirname,
        'src/docusaurus/theme/CodeBlock/__tests__/stubs/Mermaid.tsx',
      ),
      '@/docusaurus/components/ink-playground': path.resolve(
        __dirname,
        'src/docusaurus/theme/CodeBlock/__tests__/stubs/InkPlayground.tsx',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    reporters: 'default',
  },
});
