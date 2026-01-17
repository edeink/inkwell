/** @jsxImportSource @/utils/compiler */
import guideGettingStarted from './raw/guide/getting-started.markdown?raw';
import guideLayout from './raw/guide/layout.markdown?raw';
import intro from './raw/intro.markdown?raw';
import sample from './raw/sample.markdown?raw';
import sum2025 from './raw/sum-2025.markdown?raw';
import { WikiApp } from './widgets/wiki-app';

import type { WikiDoc } from './widgets/types';

import Runtime from '@/runtime';
import { Themes, type ThemePalette } from '@/styles/theme';

function parseTitle(content: string, fallback: string): string {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)\s*$/);
    if (m && m[1]) {
      return m[1].trim();
    }
  }
  return fallback;
}

function titleFromPath(path: string): string {
  const base = path.split('/').pop() || path;
  return base.replace(/\.md$/i, '');
}

const rawModules: Record<string, string> = {
  './raw/intro.md': intro,
  './raw/guide/getting-started.md': guideGettingStarted,
  './raw/guide/layout.md': guideLayout,
  './raw/sample.md': sample,
  './raw/sum-2025.md': sum2025,
};

const docs: WikiDoc[] = Object.entries(rawModules)
  .map(([p, content]) => {
    const rel = p.replace(/^\.\/raw\//, '');
    const fallback = titleFromPath(rel);
    return {
      key: rel,
      path: rel,
      title: parseTitle(content, fallback),
      content,
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

export function runApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  runtime.render(
    <WikiApp width={width} height={height} theme={theme || Themes.light} docs={docs} />,
  );
}
