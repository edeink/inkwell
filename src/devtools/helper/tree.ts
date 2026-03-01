/**
 * Devtools 树构建工具
 *
 * 提供 Widget 树哈希、节点索引与 Tree 数据构建能力。
 * 注意事项：依赖 Widget 的 parent/children 结构。
 * 潜在副作用：无。
 */
import type { Widget } from '../../core/base';
import type { DataNode } from '@/ui';

/**
 * 运行时树访问接口
 *
 * 注意事项：方法可选，缺失时视为空树。
 * 潜在副作用：无。
 */
export type RuntimeTreeLike = {
  getRootWidget?: () => Widget | null;
  getOverlayRootWidget?: () => Widget | null;
};

/**
 * Devtools 树构建结果
 *
 * 注意事项：包含索引 Map 与树数据。
 * 潜在副作用：无。
 */
export type DevtoolsTreeBuild = {
  treeData: DataNode[];
  widgetByNodeKey: Map<string, Widget>;
  parentByNodeKey: Map<string, string | null>;
  nodeKeyByWidget: WeakMap<Widget, string>;
};

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

/**
 * 计算 Widget 树哈希
 *
 * @param root 树根节点
 * @returns 哈希值
 * @remarks
 * 注意事项：用于快速判断树结构变化。
 * 潜在副作用：无。
 */
export function computeWidgetTreeHash(root: Widget | null): number {
  if (!root) {
    return 0;
  }
  let h = 2166136261;
  const stack: Widget[] = [root];
  while (stack.length) {
    const w = stack.pop()!;
    // 仅对用户数据中的显式 key 进行哈希，以避免自动生成的 key 导致的不稳定性
    // 因为自动生成的 key 在每次实例创建时都会改变（例如 Container-1 vs Container-2）。
    // 如果 w.data.key 存在，则使用它；否则在哈希中忽略 key。
    const userKey = (w.data as { key?: string })?.key;
    if (userKey !== undefined) {
      h = hashStr(h, String(userKey));
    }
    h = hashStr(h, w.type ?? '');
    const children = w.children ?? [];
    h = hashNum(h, children.length);
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }
  return h >>> 0;
}

// 计算 Runtime 树的哈希值
/**
 * 计算 Runtime 树哈希
 *
 * @param runtime 运行时树访问接口
 * @returns 哈希值
 * @remarks
 * 注意事项：同时包含主树与 overlay 树。
 * 潜在副作用：无。
 */
export function computeRuntimeTreeHash(runtime: RuntimeTreeLike): number {
  const rootHash = computeWidgetTreeHash(runtime.getRootWidget?.() ?? null);
  const overlayHash = computeWidgetTreeHash(runtime.getOverlayRootWidget?.() ?? null);
  return hashNum(rootHash, overlayHash);
}

// 获取 Widget 在 Runtime 树中的节点键
/**
 * 获取 Widget 对应的节点 key
 *
 * @param runtime 运行时树访问接口
 * @param widget 目标组件
 * @returns 节点 key 或 null
 * @remarks
 * 注意事项：若组件不在树中则返回 null。
 * 潜在副作用：无。
 */
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
/**
 * 根据节点 key 获取路径 keys
 *
 * @param nodeKey 节点 key
 * @returns 路径上所有节点 key
 * @remarks
 * 注意事项：key 使用 '-' 分割层级。
 * 潜在副作用：无。
 */
export function getPathNodeKeysByNodeKey(nodeKey: string): string[] {
  const parts = nodeKey.split('-');
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    out.push(parts.slice(0, i + 1).join('-'));
  }
  return out;
}

// 获取同级重复键
/**
 * 获取同级重复 key 列表
 *
 * @param children 子节点列表
 * @returns 重复 key 列表
 * @remarks
 * 注意事项：仅返回重复的 key 值集合。
 * 潜在副作用：无。
 */
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
/**
 * 构建 Devtools 树数据
 *
 * @param root 主树根节点
 * @param overlayRoot overlay 树根节点
 * @returns DevtoolsTreeBuild 构建结果
 * @remarks
 * 注意事项：会为重复 key 节点插入错误提示节点。
 * 潜在副作用：无。
 */
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
              title: `错误：${String(widget.type)} [${String(
                widget.key,
              )}] 下同级 key 重复：${dupKeys.map((k) => String(k)).join(', ')}`,
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
/**
 * 根据父级映射获取路径 keys
 *
 * @param parentByNodeKey 父级映射
 * @param nodeKey 目标节点 key
 * @returns 路径上所有节点 key
 * @remarks
 * 注意事项：路径包含自身节点。
 * 潜在副作用：无。
 */
export function getPathNodeKeys(parentByNodeKey: Map<string, string | null>, nodeKey: string) {
  const out: string[] = [];
  let cur: string | null = nodeKey;
  while (cur) {
    out.unshift(cur);
    cur = parentByNodeKey.get(cur) ?? null;
  }
  return out;
}
