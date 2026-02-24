/**
 * 命中节点解析工具
 *
 * 提供从命中节点向上回溯的可达性解析逻辑。
 * 注意事项：依赖 Widget 的 parent/children 关系。
 * 潜在副作用：无。
 */
import type { Widget } from '@/core/base';

/**
 * 解析命中节点
 *
 * @param root 主树根节点
 * @param hitNode 命中节点
 * @param overlayRoot overlay 树根节点
 * @returns 可达节点或原始命中节点
 * @remarks
 * 注意事项：会沿父链向上查找可达节点。
 * 潜在副作用：无。
 */
export function resolveHitWidget(
  root: Widget,
  hitNode: Widget | null,
  overlayRoot?: Widget | null,
): Widget | null {
  if (!root || !hitNode) {
    return hitNode;
  }

  const roots = [root, overlayRoot].filter(Boolean) as Widget[];

  const isReachableInTree = (treeRoot: Widget, target: Widget): boolean => {
    if (target === treeRoot) {
      return true;
    }
    let cur: Widget | null = target;
    while (cur && cur !== treeRoot) {
      const p = cur.parent as Widget | null;
      if (!p) {
        return false;
      }
      const children = (p.children ?? []) as Widget[];
      if (!children.includes(cur)) {
        return false;
      }
      cur = p;
    }
    return cur === treeRoot;
  };

  const isReachableInAnyTree = (target: Widget): boolean => {
    for (const r of roots) {
      if (isReachableInTree(r, target)) {
        return true;
      }
    }
    return false;
  };

  let target: Widget | null = hitNode;

  while (target) {
    if (isReachableInAnyTree(target)) {
      return target;
    }
    target = target.parent as Widget | null;
  }

  // 如果向上查找都没找到（例如都在树外，或者 key 都有问题），回退到原始命中节点
  return hitNode;
}
