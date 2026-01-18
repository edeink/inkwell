/** @jsxImportSource @/utils/compiler */
import {
  flattenSidebarToDocMetas,
  parseMarkdownFrontMatter,
  type SidebarItem,
} from './helpers/wiki-doc';
import sidebars from './raw/sidebar';
import { WikiApp } from './widgets/wiki-app';

import type { WikiDoc } from './widgets/types';

import Runtime from '@/runtime';
import { Themes, type ThemePalette } from '@/styles/theme';

type WikiSidebarRoot = { docs: SidebarItem[] };

type WebpackContextModule = {
  keys: () => string[];
  (id: string): unknown;
};

type WebpackRequire = {
  context: (path: string, recursive: boolean, regExp: RegExp) => WebpackContextModule;
};

declare const require: WebpackRequire;

function unwrapMarkdownModule(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'default' in value) {
    const d = (value as { default?: unknown }).default;
    if (typeof d === 'string') {
      return d;
    }
  }
  return '';
}

function moduleKeyToDocId(modulePath: string): string {
  const normalized = modulePath.replace(/\\/g, '/');
  const marker = '/raw/';
  const idx = normalized.lastIndexOf(marker);
  const afterRaw =
    idx >= 0 ? normalized.slice(idx + marker.length) : normalized.replace(/^(\.\/|\.\.\/)+/, '');
  const cleaned = afterRaw.replace(/^raw\//, '');
  return cleaned.replace(/\.(md|markdown)$/i, '');
}

const sidebarItems = (sidebars as WikiSidebarRoot).docs;
const docs: WikiDoc[] = flattenSidebarToDocMetas(sidebarItems).map((m) => ({
  key: m.id,
  path: m.id,
  title: m.title,
  content: '',
}));

let webpackRawByDocKey: Record<string, string> | null = null;
try {
  const ctx = require.context('./raw', true, /\.markdown$/);
  const map: Record<string, string> = {};
  for (const key of ctx.keys()) {
    const docKey = moduleKeyToDocId(key);
    map[docKey] = unwrapMarkdownModule(ctx(key));
  }
  webpackRawByDocKey = map;
} catch {
  webpackRawByDocKey = null;
}

const docLinkByKey: Record<string, string> = (() => {
  if (webpackRawByDocKey) {
    return Object.fromEntries(
      Object.entries(webpackRawByDocKey).map(([docKey, raw]) => {
        const parsed = parseMarkdownFrontMatter(raw);
        return [docKey, parsed.frontMatter.link || docKey];
      }),
    );
  }
  return {};
})();

const docKeyByLink: Record<string, string> = Object.fromEntries(
  Object.entries(docLinkByKey).map(([docKey, link]) => [link, docKey]),
);

const loadDoc: (docId: string) => Promise<{ content: string }> = async (docId: string) => {
  const raw = webpackRawByDocKey?.[docId] ?? '';
  return { content: String(raw) };
};

export function runApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  const initialSelectedKey = (() => {
    if (typeof window === 'undefined') {
      return '';
    }
    const params = new URLSearchParams(window.location.search);
    const link = params.get('link') || '';
    return docKeyByLink[link] || link || '';
  })();

  runtime.render(
    <WikiApp
      width={width}
      height={height}
      theme={theme || Themes.light}
      docs={docs}
      loadDoc={loadDoc}
      sidebarItems={sidebarItems}
      initialSelectedKey={initialSelectedKey}
      docLinkByKey={docLinkByKey}
    />,
  );
}
