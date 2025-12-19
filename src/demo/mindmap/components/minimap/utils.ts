export type Rect = { x: number; y: number; width: number; height: number };
export type Fit = { s: number; ox: number; oy: number };

export function fitBounds(bounds: Rect, w: number, h: number, padding: number = 0): Fit {
  const contentW = Math.max(1, bounds.width + padding * 2);
  const contentH = Math.max(1, bounds.height + padding * 2);
  const sx = w / contentW;
  const sy = h / contentH;
  const s = Math.min(sx, sy);

  // 在计算缩放时包含内边距以居中内容
  const ox = (w - bounds.width * s) / 2 - bounds.x * s;
  const oy = (h - bounds.height * s) / 2 - bounds.y * s;

  return { s, ox, oy };
}

export function computeViewportRect(
  containerW: number,
  containerH: number,
  viewScale: number,
  viewTx: number,
  viewTy: number,
  contentTx: number,
  contentTy: number,
  fit: Fit,
): { x: number; y: number; width: number; height: number } {
  // 将屏幕坐标 (0,0) 映射到节点空间。
  // 屏幕坐标 = (节点坐标 + 内容偏移) * 缩放比例 + 视图平移
  // 节点坐标 = (屏幕坐标 - 视图平移) / 缩放比例 - 内容偏移

  const x0 = (0 - viewTx) / viewScale - contentTx;
  const y0 = (0 - viewTy) / viewScale - contentTy;
  const vw = containerW / viewScale;
  const vh = containerH / viewScale;

  const mx = fit.ox + x0 * fit.s;
  const my = fit.oy + y0 * fit.s;
  const mw = vw * fit.s;
  const mh = vh * fit.s;
  return { x: mx, y: my, width: mw, height: mh };
}
