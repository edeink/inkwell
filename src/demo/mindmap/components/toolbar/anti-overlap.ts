import { MindMapNode } from '../../custom-widget/mindmap-node';

import type { Widget } from '@/core';
import type Runtime from '@/runtime';

export type Rect = { x: number; y: number; width: number; height: number };

function collectNodeRects(runtime: Runtime): Rect[] {
  const root = runtime.getRootWidget();
  if (!root) {
    return [];
  }
  const out: Rect[] = [];
  const walk = (w: Widget) => {
    if (w instanceof MindMapNode) {
      const p = w.getAbsolutePosition();
      const s = w.renderObject.size;
      out.push({ x: p.dx, y: p.dy, width: s.width, height: s.height });
    }
    for (const c of w.children ?? []) {
      walk(c);
    }
  };
  walk(root);
  return out;
}

function intersects(a: Rect, b: Rect, gap: number): boolean {
  const ax1 = a.x - gap;
  const ay1 = a.y - gap;
  const ax2 = a.x + a.width + gap;
  const ay2 = a.y + a.height + gap;
  const bx1 = b.x;
  const by1 = b.y;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
}

export function computePlacementForSibling(
  runtime: Runtime,
  refRect: Rect,
  dir: -1 | 1,
  estSize: { width: number; height: number } = { width: 120, height: 48 },
  minGap = 50,
): { dx: number; dy: number } {
  const rects = collectNodeRects(runtime);
  const cx = refRect.x;
  let cy = refRect.y + (dir > 0 ? refRect.height + minGap : -(estSize.height + minGap));
  let i = 0;
  while (
    rects.some((r) =>
      intersects({ x: cx, y: cy, width: estSize.width, height: estSize.height }, r, minGap),
    )
  ) {
    cy += estSize.height + minGap;
    i++;
    if (i > 1000) {
      break;
    }
  }
  return { dx: cx, dy: cy };
}

export function computePlacementForChildSide(
  runtime: Runtime,
  refRect: Rect,
  side: 'left' | 'right',
  estSize: { width: number; height: number } = { width: 120, height: 48 },
  minGap = 50,
): { dx: number; dy: number } {
  const rects = collectNodeRects(runtime);
  const cx =
    side === 'right' ? refRect.x + refRect.width + minGap : refRect.x - estSize.width - minGap;
  let cy = refRect.y;
  const cand = (): Rect => ({ x: cx, y: cy, width: estSize.width, height: estSize.height });
  let i = 0;
  while (rects.some((r) => intersects(cand(), r, minGap))) {
    cy += estSize.height + minGap;
    i++;
    if (i > 1000) {
      break;
    }
  }
  return { dx: cx, dy: cy };
}
