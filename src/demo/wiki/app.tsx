/** @jsxImportSource @/utils/compiler */
import {
  buildDocKeyByLink,
  buildDocLinkByKey,
  loadRawMarkdownByDocKeyFromViteModules,
  loadRawMarkdownByDocKeyFromWebpack,
  resolveInitialSelectedKeyFromLocation,
} from './helpers/loader';
import { flattenSidebarToDocMetas, type SidebarItem } from './helpers/wiki-doc';
import sidebars from './raw/sidebar';
import { WikiApp } from './widgets/wiki-app';

import type { WikiDoc } from './widgets/types';

import Runtime from '@/runtime';
import { Themes, type ThemePalette } from '@/styles/theme';

type WikiSidebarRoot = { docs: SidebarItem[] };

const sidebarItems = (sidebars as WikiSidebarRoot).docs;
const docs: WikiDoc[] = flattenSidebarToDocMetas(sidebarItems).map((m) => ({
  key: m.id,
  path: m.id,
  title: m.title,
  content: '',
}));

const webpackRawByDocKey = loadRawMarkdownByDocKeyFromWebpack();

export function runApp(
  runtime: Runtime,
  width: number,
  height: number,
  theme: ThemePalette,
  opts?: { rawModules?: Record<string, unknown> },
) {
  const rawByDocKey =
    webpackRawByDocKey ??
    (opts?.rawModules ? loadRawMarkdownByDocKeyFromViteModules(opts.rawModules) : null);
  const docLinkByKey: Record<string, string> = rawByDocKey ? buildDocLinkByKey(rawByDocKey) : {};
  const docKeyByLink: Record<string, string> = buildDocKeyByLink(docLinkByKey);
  const initialSelectedKey = resolveInitialSelectedKeyFromLocation(docKeyByLink);
  const loadDoc: (docId: string) => Promise<{ content: string }> = async (docId: string) => {
    const raw = rawByDocKey?.[docId] ?? '';
    return { content: String(raw) };
  };

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
