/** @jsxImportSource @/utils/compiler */
import {
  createWikiDocLoader,
  flattenSidebarToDocMetas,
  parseMarkdownFrontMatter,
  type SidebarItem,
} from './helpers/wiki-doc';
import gettingStarted from './raw/guide/getting-started.markdown?raw';
import layout from './raw/guide/layout.markdown?raw';
import intro from './raw/intro.markdown?raw';
import sample from './raw/sample.markdown?raw';
import sidebars from './raw/sidebar';
import sum2025 from './raw/sum-2025.markdown?raw';
import { WikiApp } from './widgets/wiki-app';

import type { WikiDoc } from './widgets/types';

import Runtime from '@/runtime';
import { Themes, type ThemePalette } from '@/styles/theme';

type WikiSidebarRoot = { docs: SidebarItem[] };

const rawMarkdownModules: Record<string, () => Promise<unknown>> = {
  './raw/intro.markdown': async () => intro,
  './raw/guide/getting-started.markdown': async () => gettingStarted,
  './raw/guide/layout.markdown': async () => layout,
  './raw/sample.markdown': async () => sample,
  './raw/sum-2025.markdown': async () => sum2025,
};

const rawMarkdownByDocKey: Record<string, string> = {
  intro,
  'guide/getting-started': gettingStarted,
  'guide/layout': layout,
  sample,
  'sum-2025': sum2025,
};

const docLinkByKey: Record<string, string> = Object.fromEntries(
  Object.entries(rawMarkdownByDocKey).map(([docKey, raw]) => {
    const parsed = parseMarkdownFrontMatter(raw);
    return [docKey, parsed.frontMatter.link || docKey];
  }),
);

const docKeyByLink: Record<string, string> = Object.fromEntries(
  Object.entries(docLinkByKey).map(([docKey, link]) => [link, docKey]),
);

const sidebarItems = (sidebars as WikiSidebarRoot).docs;
const docs: WikiDoc[] = flattenSidebarToDocMetas(sidebarItems).map((m) => ({
  key: m.id,
  path: m.id,
  title: m.title,
  content: '',
}));

const loadDoc = createWikiDocLoader(rawMarkdownModules);

export function runApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  const initialSelectedKey = (() => {
    if (typeof window === 'undefined') {
      return '';
    }
    const params = new URLSearchParams(window.location.search);
    const link = params.get('link') || '';
    return docKeyByLink[link] || '';
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
