import { parseMarkdownFrontMatter } from './wiki-doc';

type WebpackContextModule = {
  keys: () => string[];
  (id: string): unknown;
};

type WebpackRequire = {
  context: (path: string, recursive: boolean, regExp: RegExp) => WebpackContextModule;
};

declare const require: WebpackRequire;

export type WikiRawMarkdownMap = Record<string, string>;

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

/**
 * Wiki Demo 的 Markdown 加载策略：
 * - Webpack/Docusaurus：用 require.context 扫描 raw 目录并读取为字符串
 * - 非 Webpack 环境：返回 null，交给上层决定兜底策略（例如 Vite 入口使用 import.meta.glob）
 */
export function loadRawMarkdownByDocKeyFromWebpack(): WikiRawMarkdownMap | null {
  try {
    const ctx = require.context('../raw', true, /\.markdown$/);
    const map: Record<string, string> = {};
    for (const key of ctx.keys()) {
      const docKey = moduleKeyToDocId(key);
      map[docKey] = unwrapMarkdownModule(ctx(key));
    }
    return map;
  } catch {
    return null;
  }
}

export function loadRawMarkdownByDocKeyFromViteModules(
  modules: Record<string, unknown>,
): WikiRawMarkdownMap {
  const map: Record<string, string> = {};
  for (const [key, value] of Object.entries(modules)) {
    const docKey = moduleKeyToDocId(key);
    map[docKey] = unwrapMarkdownModule(value);
  }
  return map;
}

export function buildDocLinkByKey(rawByDocKey: WikiRawMarkdownMap): Record<string, string> {
  return Object.fromEntries(
    Object.entries(rawByDocKey).map(([docKey, raw]) => {
      const parsed = parseMarkdownFrontMatter(raw);
      return [docKey, parsed.frontMatter.link || docKey];
    }),
  );
}

export function buildDocKeyByLink(docLinkByKey: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(docLinkByKey).map(([docKey, link]) => [link, docKey]));
}

export function resolveInitialSelectedKeyFromLocation(
  docKeyByLink: Record<string, string>,
): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const params = new URLSearchParams(window.location.search);
  const link = params.get('link') || '';
  return docKeyByLink[link] || link || '';
}
