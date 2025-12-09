import type { Offset, Size } from '@/core/base';

function buildSubtreeHeight(
  sizeByKey: Map<string, Size>,
  childMap: Map<string, string[]>,
  nodeSpacing: number,
) {
  const cache = new Map<string, number>();
  const fn = (key: string): number => {
    const hit = cache.get(key);
    if (hit !== undefined) {
      return hit;
    }
    const size = sizeByKey.get(key) as Size;
    const children = childMap.get(key) || [];
    if (!children.length) {
      cache.set(key, size.height);
      return size.height;
    }
    let sum = 0;
    for (let i = 0; i < children.length; i++) {
      sum += fn(children[i]);
      if (i < children.length - 1) {
        sum += nodeSpacing;
      }
    }
    const h = Math.max(sum, size.height);
    cache.set(key, h);
    return h;
  };
  return fn;
}

function place(
  posByKey: Map<string, Offset>,
  sizeByKey: Map<string, Size>,
  childMap: Map<string, string[]>,
  nodeSpacing: number,
  spacingX: number,
  side: 'left' | 'right',
  key: string,
  x: number,
  y: number,
  depth: number,
  hFn: (k: string) => number,
): number {
  const size = sizeByKey.get(key) as Size;
  posByKey.set(key, { dx: x, dy: y });
  const children = childMap.get(key) || [];
  if (!children.length) {
    return depth;
  }
  const dir = side === 'right' ? 1 : -1;
  const hs = children.map((c) => hFn(c));
  const blockH = hs.reduce((a, b) => a + b, 0) + nodeSpacing * Math.max(0, children.length - 1);
  let yStart = y + (size.height - blockH) / 2;
  let levels = depth;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    const cx = x + dir * (size.width + spacingX);
    const cy = yStart;
    levels = Math.max(
      levels,
      place(posByKey, sizeByKey, childMap, nodeSpacing, spacingX, side, c, cx, cy, depth + 1, hFn),
    );
    yStart += hs[i] + nodeSpacing;
  }
  return levels;
}

export function computeTreePositions(
  sizeByKey: Map<string, Size>,
  childMap: Map<string, string[]>,
  rootKey: string,
  spacingX: number,
  nodeSpacing: number,
  side: 'left' | 'right',
): { posByKey: Map<string, Offset>; levels: number } {
  const posByKey = new Map<string, Offset>();
  const hFn = buildSubtreeHeight(sizeByKey, childMap, nodeSpacing);
  const levels = place(
    posByKey,
    sizeByKey,
    childMap,
    nodeSpacing,
    spacingX,
    side,
    rootKey,
    0,
    0,
    0,
    hFn,
  );
  return { posByKey, levels: levels + 1 };
}
