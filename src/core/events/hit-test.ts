/**
 * 命中测试
 *
 * 模块功能说明：
 * - 在组件树中根据坐标查找最深层命中的组件作为事件目标。
 * - 支持视口（Viewport）缩放和平移的坐标变换。
 *
 * 使用注意事项：
 * - 坐标采用画布坐标系，若树中存在 Viewport 会先进行反变换。
 */
import type { Widget } from '@/core/base';

import { findWidget } from '@/core/helper/widget-selector';

export function hitTest(root: Widget | null, x: number, y: number): Widget | null {
  if (!root) {
    return null;
  }
  const vp = findWidget(root, 'Viewport') as Widget | null;
  if (vp) {
    const obj = vp as unknown as { scale?: number; tx?: number; ty?: number };
    const s = typeof obj.scale === 'number' ? obj.scale || 1 : 1;
    const tx = typeof obj.tx === 'number' ? obj.tx || 0 : 0;
    const ty = typeof obj.ty === 'number' ? obj.ty || 0 : 0;
    x = (x - tx) / s;
    y = (y - ty) / s;
  }
  let found: Widget | null = null;
  function dfs(node: Widget): void {
    const peNone = node.pointerEvents === 'none';
    if (peNone) {
      const children = node.children.slice().sort((a, b) => a.zIndex - b.zIndex);
      for (const child of children) {
        dfs(child);
      }
      return;
    }
    if (node.hitTest(x, y)) {
      found = node;
      const children = node.children.slice().sort((a, b) => a.zIndex - b.zIndex);
      for (const child of children) {
        dfs(child);
      }
    }
  }
  dfs(root);
  return found;
}
