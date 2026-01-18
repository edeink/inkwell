import { NodeType, type MarkdownNode } from '../widgets/markdown-preview/parser';

import type { SidebarItem } from './wiki-doc';
import type { WikiDocMeta } from '../widgets/types';
import type { WikiNavNode, WikiNavPanelStyle } from '../widgets/wiki-nav-panel';
import type { Widget } from '@/core';
import type { ThemePalette } from '@/styles/theme';

/**
 * 该文件聚合 WikiApp 相关的“纯函数”与样式配置：
 * - 目录树节点构建
 * - Markdown 标题目录（TOC）收集
 * - 通用样式（用于减少调用处大量 props）
 *
 * 约束：不依赖 Widget 实例状态（除 sumOffsetYUntil 这种纯计算）。
 */
export type MarkdownTocItem = {
  key: string;
  text: string;
  level: number;
};

export function createUnifiedWikiNavPanelStyle(theme: ThemePalette): WikiNavPanelStyle {
  return {
    scrollBarWidth: 6,
    scrollBarColor: theme.text.secondary,
    padding: 12,
    containerColor: theme.background.surface,
    borderRadius: 0,
    rowHeight: 28,
    rowGap: 6,
    rowRadius: 6,
    basePaddingLeft: 8,
    basePaddingRight: 8,
    indentWidth: 12,
    leafIndentOffset: 0,
    activeRowColor: theme.state.selected,
    inactiveRowColor: 'transparent',
    activeTextColor: theme.text.primary,
    inactiveTextColor: theme.text.secondary,
  };
}

export function collectToc(ast: MarkdownNode, keyPrefix: string): MarkdownTocItem[] {
  const out: MarkdownTocItem[] = [];
  let idx = 0;
  for (const node of ast.children ?? []) {
    if (node.type !== NodeType.Header) {
      continue;
    }
    const level = node.level ?? 1;
    const text = node.children?.map((c) => c.content || '').join('') || '';
    out.push({ key: `${keyPrefix}-${idx++}`, text, level });
  }
  return out;
}

function toTitleFromPath(path: string): string {
  const base = path.split('/').pop() || path;
  return base.replace(/\.md$/i, '');
}

export function buildNavNodesFromSidebarItems(
  sidebarItems: SidebarItem[],
  docs: WikiDocMeta[],
): WikiNavNode[] {
  const docTitleById = new Map<string, string>();
  for (const d of docs) {
    docTitleById.set(d.key, d.title);
  }

  const makeDirKey = (parentKey: string, label: string) => `dir:${parentKey}/${label}`;

  const walk = (items: SidebarItem[], parentKey: string, depth: number): WikiNavNode[] => {
    const out: WikiNavNode[] = [];
    for (const item of items) {
      if (typeof item === 'string') {
        const title = docTitleById.get(item) || toTitleFromPath(item);
        out.push({ key: item, text: title, indentLevel: depth });
        continue;
      }
      if (item.type === 'doc') {
        const title = item.label || docTitleById.get(item.id) || toTitleFromPath(item.id);
        out.push({ key: item.id, text: title, indentLevel: depth });
        continue;
      }
      if (item.type === 'category') {
        const dirKey = makeDirKey(parentKey, item.label);
        out.push({
          key: dirKey,
          text: item.label,
          indentLevel: depth,
          defaultExpanded: item.collapsed !== true,
          children: walk(item.items, dirKey, depth + 1),
        });
        continue;
      }
    }
    return out;
  };

  return walk(sidebarItems, 'root', 0);
}

export function buildNavNodesFromDocs(docs: WikiDocMeta[]): WikiNavNode[] {
  const root: WikiNavNode = { key: 'root', text: 'root', indentLevel: -1, children: [] };
  const dirMap = new Map<string, WikiNavNode>();
  dirMap.set('root', root);

  const ensureDir = (pathKey: string, title: string, depth: number): WikiNavNode => {
    const exist = dirMap.get(pathKey);
    if (exist && exist.children) {
      return exist;
    }
    const node: WikiNavNode = { key: pathKey, text: title, indentLevel: depth, children: [] };
    dirMap.set(pathKey, node);
    return node;
  };

  const sorted = docs.slice().sort((a, b) => a.path.localeCompare(b.path));
  for (const doc of sorted) {
    const segs = doc.path.split('/').filter(Boolean);
    let parentKey = 'root';
    let depth = 0;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const isFile = i === segs.length - 1;
      if (isFile) {
        const parent = dirMap.get(parentKey);
        if (parent?.children) {
          parent.children.push({
            key: doc.key,
            text: doc.title || toTitleFromPath(doc.path),
            indentLevel: depth,
          });
        }
      } else {
        const dirKey = `${parentKey}/${seg}`;
        const parent = dirMap.get(parentKey);
        const cur = ensureDir(dirKey, seg, depth);
        if (parent?.children) {
          if (!parent.children.some((c) => c.key === dirKey && c.children)) {
            parent.children.push(cur);
          }
        }
        parentKey = dirKey;
        depth++;
      }
    }
  }

  const sortChildren = (nodes: WikiNavNode[]) => {
    nodes.sort((a, b) => {
      const aIsDir = !!a.children?.length;
      const bIsDir = !!b.children?.length;
      if (aIsDir !== bIsDir) {
        return aIsDir ? -1 : 1;
      }
      return a.text.localeCompare(b.text);
    });
    for (const n of nodes) {
      if (n.children?.length) {
        sortChildren(n.children);
      }
    }
  };

  sortChildren(root.children!);
  return root.children!;
}

export function sumOffsetYUntil(widget: Widget, stopAt: Widget): number {
  let cur: Widget | null = widget;
  let y = 0;
  while (cur && cur !== stopAt) {
    y += cur.renderObject.offset.dy || 0;
    cur = cur.parent as Widget | null;
  }
  return y;
}
