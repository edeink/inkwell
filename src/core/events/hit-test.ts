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

function findViewportAncestor(node: Widget | null): Widget | null {
  let cur: Widget | null = node;
  while (cur) {
    if (cur.type === 'Viewport') {
      return cur;
    }
    cur = cur.parent;
  }
  return null;
}

function findViewportInTree(root: Widget | null): Widget | null {
  if (!root) {
    return null;
  }
  if (root.type === 'Viewport') {
    return root;
  }
  for (const c of root.children) {
    const r = findViewportInTree(c);
    if (r) {
      return r;
    }
  }
  return null;
}

function isViewportLike(w: Widget | null): w is Widget & { scale: number; tx: number; ty: number } {
  if (!w) {
    return false;
  }
  const obj = w as unknown as { scale?: unknown; tx?: unknown; ty?: unknown };
  return (
    w.type === 'Viewport' &&
    typeof obj.scale === 'number' &&
    typeof obj.tx === 'number' &&
    typeof obj.ty === 'number'
  );
}

export function hitTest(root: Widget | null, x: number, y: number): Widget | null {
  if (!root) {
    return null;
  }
  const vp = findViewportInTree(root);
  if (vp) {
    const s = isViewportLike(vp) ? vp.scale || 1 : 1;
    const tx = isViewportLike(vp) ? vp.tx || 0 : 0;
    const ty = isViewportLike(vp) ? vp.ty || 0 : 0;
    x = (x - tx) / s;
    y = (y - ty) / s;
  }
  let found: Widget | null = null;
  function dfs(node: Widget): void {
    const pos = node.getAbsolutePosition();
    const left = pos.dx;
    const top = pos.dy;
    const width = node.renderObject.size.width;
    const height = node.renderObject.size.height;
    if (x >= left && x <= left + width && y >= top && y <= top + height) {
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
