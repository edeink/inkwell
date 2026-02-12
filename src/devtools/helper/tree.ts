import { formatSiblingDuplicateKeyError } from '../constants';

import type { Widget } from '../../core/base';
import type { DataNode } from '@/ui';

export type RuntimeTreeLike = {
  getRootWidget?: () => Widget | null;
  getOverlayRootWidget?: () => Widget | null;
};

export type DevtoolsTreeBuild = {
  treeData: DataNode[];
  widgetByNodeKey: Map<string, Widget>;
  parentByNodeKey: Map<string, string | null>;
  nodeKeyByWidget: WeakMap<Widget, string>;
};

const objIdByRef = new WeakMap<object, number>();
let objIdSeq = 1;

// 计算对象的唯一 ID
function getObjId(v: unknown): number {
  if (!v || (typeof v !== 'object' && typeof v !== 'function')) {
    return 0;
  }
  const obj = v as object;
  const existed = objIdByRef.get(obj);
  if (existed != null) {
    return existed;
  }
  const next = objIdSeq++;
  objIdByRef.set(obj, next);
  return next;
}

function hashStr(h: number, s: string): number {
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h;
}

function hashNum(h: number, n: number): number {
  h ^= n >>> 0;
  return Math.imul(h, 16777619);
}

export function computeWidgetTreeHash(root: Widget | null): number {
  if (!root) {
    return 0;
  }
  let h = 2166136261;
  const stack: Widget[] = [root];
  while (stack.length) {
    const w = stack.pop()!;
    h = hashStr(h, w.key ?? '');
    h = hashStr(h, w.type ?? '');
    h = hashNum(h, getObjId((w as unknown as { data?: unknown }).data));
    const children = w.children ?? [];
    h = hashNum(h, children.length);
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }
  return h >>> 0;
}

// 计算 Runtime 树的哈希值
export function computeRuntimeTreeHash(runtime: RuntimeTreeLike): number {
  const rootHash = computeWidgetTreeHash(runtime.getRootWidget?.() ?? null);
  const overlayHash = computeWidgetTreeHash(runtime.getOverlayRootWidget?.() ?? null);
  return hashNum(rootHash, overlayHash);
}

// 获取 Widget 在 Runtime 树中的节点键
export function getNodeKeyByWidget(runtime: RuntimeTreeLike, widget: Widget): string | null {
  const roots = [
    runtime.getRootWidget?.() ?? null,
    runtime.getOverlayRootWidget?.() ?? null,
  ].filter(Boolean) as Widget[];
  const wRoot = widget.root;
  const rootIndex = roots.findIndex((r) => r === wRoot);
  if (rootIndex < 0) {
    return null;
  }
  if (widget === wRoot) {
    return String(rootIndex);
  }
  const indices: number[] = [];
  const visited = new WeakSet<Widget>();
  let cur: Widget | null = widget;
  let guard = 0;
  while (cur && cur !== wRoot) {
    if (visited.has(cur)) {
      return null;
    }
    visited.add(cur);
    guard++;
    if (guard > 2000) {
      return null;
    }
    const p: Widget | null = cur.parent;
    if (!p) {
      break;
    }
    let idx = -1;
    const list = p.children ?? [];
    for (let i = 0; i < list.length; i++) {
      if (list[i] === cur) {
        idx = i;
        break;
      }
    }
    if (idx < 0) {
      break;
    }
    indices.push(idx);
    cur = p;
  }
  let key = String(rootIndex);
  for (let i = indices.length - 1; i >= 0; i--) {
    key = `${key}-${indices[i]}`;
  }
  return key;
}

// 获取节点键的所有路径节点键
export function getPathNodeKeysByNodeKey(nodeKey: string): string[] {
  const parts = nodeKey.split('-');
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    out.push(parts.slice(0, i + 1).join('-'));
  }
  return out;
}

// 获取同级重复键
export function getSiblingDuplicateKeys(children: Widget[]): unknown[] {
  const seen = new Map<unknown, number>();
  const dup = new Set<unknown>();
  for (let i = 0; i < children.length; i++) {
    const k = (children[i] as unknown as { key?: unknown }).key;
    if (k == null) {
      continue;
    }
    if (seen.has(k)) {
      dup.add(k);
    } else {
      seen.set(k, i);
    }
  }
  return Array.from(dup);
}

// 构建开发工具树
export function buildDevtoolsTree(
  root: Widget | null,
  overlayRoot: Widget | null,
): DevtoolsTreeBuild {
  const widgetByNodeKey = new Map<string, Widget>();
  const parentByNodeKey = new Map<string, string | null>();
  const nodeKeyByWidget = new WeakMap<Widget, string>();

  function wrap(widget: Widget, nodeKey: string, parentNodeKey: string | null): DataNode {
    widgetByNodeKey.set(nodeKey, widget);
    parentByNodeKey.set(nodeKey, parentNodeKey);
    nodeKeyByWidget.set(widget, nodeKey);

    const children = widget.children ?? [];
    const dupKeys = getSiblingDuplicateKeys(children);
    const errorNodes: DataNode[] =
      dupKeys.length > 0
        ? [
            {
              key: `${nodeKey}::error`,
              title: formatSiblingDuplicateKeyError(widget.type, widget.key, dupKeys),
              disabled: true,
              selectable: false,
              isLeaf: true,
            },
          ]
        : [];

    const childNodes = children.map((c, index) => wrap(c, `${nodeKey}-${index}`, nodeKey));

    return {
      key: nodeKey,
      title: `${String(widget.type)} [${String(widget.key)}]`,
      children: errorNodes.concat(childNodes),
    };
  }

  const roots = [root, overlayRoot].filter(Boolean) as Widget[];
  if (roots.length === 0) {
    return { treeData: [], widgetByNodeKey, parentByNodeKey, nodeKeyByWidget };
  }

  return {
    treeData: roots.map((r, idx) => wrap(r, String(idx), null)),
    widgetByNodeKey,
    parentByNodeKey,
    nodeKeyByWidget,
  };
}

// 获取节点键的所有路径节点键
export function getPathNodeKeys(parentByNodeKey: Map<string, string | null>, nodeKey: string) {
  const out: string[] = [];
  let cur: string | null = nodeKey;
  while (cur) {
    out.unshift(cur);
    cur = parentByNodeKey.get(cur) ?? null;
  }
  return out;
}
