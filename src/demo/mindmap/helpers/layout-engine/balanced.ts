import type { Offset, Size } from '@/core/base';

import { Side } from '@/demo/mindmap/type';

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

function placeSubtree(
  posByKey: Map<string, Offset>,
  sizeByKey: Map<string, Size>,
  childMap: Map<string, string[]>,
  nodeSpacing: number,
  spacingX: number,
  side: Side,
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
  const dir = side === Side.Right ? 1 : -1;
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
      placeSubtree(
        posByKey,
        sizeByKey,
        childMap,
        nodeSpacing,
        spacingX,
        side,
        c,
        cx,
        cy,
        depth + 1,
        hFn,
      ),
    );
    yStart += hs[i] + nodeSpacing;
  }
  return levels;
}

export function computeBalancedTreePositions(
  sizeByKey: Map<string, Size>,
  childMap: Map<string, string[]>,
  rootKey: string,
  spacingX: number,
  nodeSpacing: number,
  prefSideByKey: Map<string, Side | undefined>,
): { posByKey: Map<string, Offset>; levels: number } {
  const posByKey = new Map<string, Offset>();
  const hFn = buildSubtreeHeight(sizeByKey, childMap, nodeSpacing);
  const rootSize = sizeByKey.get(rootKey) as Size;
  posByKey.set(rootKey, { dx: 0, dy: 0 });
  const children = childMap.get(rootKey) || [];
  const hs = children.map((c) => hFn(c));
  const left: string[] = [];
  const right: string[] = [];
  let leftSum = 0;
  let rightSum = 0;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    const pref = prefSideByKey.get(c);
    const h = hs[i];
    if (pref === Side.Left) {
      left.push(c);
      leftSum += h + (left.length > 1 ? nodeSpacing : 0);
    } else if (pref === Side.Right) {
      right.push(c);
      rightSum += h + (right.length > 1 ? nodeSpacing : 0);
    } else if (leftSum <= rightSum) {
      left.push(c);
      leftSum += h + (left.length > 1 ? nodeSpacing : 0);
    } else {
      right.push(c);
      rightSum += h + (right.length > 1 ? nodeSpacing : 0);
    }
  }
  const leftBlockH = left.reduce((acc, k, idx) => acc + hFn(k) + (idx > 0 ? nodeSpacing : 0), 0);
  const rightBlockH = right.reduce((acc, k, idx) => acc + hFn(k) + (idx > 0 ? nodeSpacing : 0), 0);
  let yLeft = (rootSize.height - leftBlockH) / 2;
  let yRight = (rootSize.height - rightBlockH) / 2;
  let levels = 0;
  for (const c of left) {
    const chH = hFn(c);
    const cx = 0 - (rootSize.width + spacingX);
    const cy = yLeft;
    levels = Math.max(
      levels,
      placeSubtree(
        posByKey,
        sizeByKey,
        childMap,
        nodeSpacing,
        spacingX,
        Side.Left,
        c,
        cx,
        cy,
        1,
        hFn,
      ),
    );
    yLeft += chH + nodeSpacing;
  }
  for (const c of right) {
    const chH = hFn(c);
    const cx = 0 + (rootSize.width + spacingX);
    const cy = yRight;
    levels = Math.max(
      levels,
      placeSubtree(
        posByKey,
        sizeByKey,
        childMap,
        nodeSpacing,
        spacingX,
        Side.Right,
        c,
        cx,
        cy,
        1,
        hFn,
      ),
    );
    yRight += chH + nodeSpacing;
  }
  return { posByKey, levels: levels + 1 };
}
