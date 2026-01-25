import type { Widget } from '@/core/base';

/**
 * 解析命中节点
 * 尝试从命中节点向上查找，直到找到一个在树中可以通过选择器定位到的节点。
 * 这保证了 DevTools 的 Tree 跳转和高亮的一致性。
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
