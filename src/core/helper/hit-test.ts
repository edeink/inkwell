import type { Widget } from '../base';

function hasZIndex(children: Widget[]): boolean {
  for (const child of children) {
    if (child.zIndex !== 0) {
      return true;
    }
  }
  return false;
}

export function hitTest(root: Widget | null, x: number, y: number): Widget | null {
  if (!root) {
    return null;
  }

  if (!root.hitTest(x, y)) {
    return null;
  }

  const children = root.children;
  if (children.length === 0) {
    return root;
  }

  if (!hasZIndex(children)) {
    for (let i = children.length - 1; i >= 0; i--) {
      const res = hitTest(children[i], x, y);
      if (res) {
        return res;
      }
    }
    return root;
  }

  const ordered = children
    .slice()
    .reverse()
    .sort((a, b) => b.zIndex - a.zIndex);
  for (const child of ordered) {
    const res = hitTest(child, x, y);
    if (res) {
      return res;
    }
  }
  return root;
}
