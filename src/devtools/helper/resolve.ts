import type { Widget } from '@/core/base';

import { findWidget } from '@/core/helper/widget-selector';

/**
 * 解析命中节点
 * 尝试从命中节点向上查找，直到找到一个在树中可以通过选择器定位到的节点。
 * 这保证了 DevTools 的 Tree 跳转和高亮的一致性。
 */
export function resolveHitWidget(root: Widget, hitNode: Widget | null): Widget | null {
  if (!root || !hitNode) {
    return hitNode;
  }
  let target: Widget | null = hitNode;

  while (target) {
    try {
      // 尝试用 key 查找
      const found = findWidget(root, `#${target.key}`);
      if (found) {
        // 如果找到了，返回找到的实例（通常是同一个，或者是树中的代理）
        return found as Widget;
      }
    } catch (e) {
      // 忽略选择器错误
    }
    target = target.parent as Widget | null;
  }

  // 如果向上查找都没找到（例如都在树外，或者 key 都有问题），回退到原始命中节点
  return hitNode;
}
