export type Rect = { x: number; y: number; width: number; height: number };
export type Fit = { s: number; ox: number; oy: number };

export function fitBounds(bounds: Rect, w: number, h: number): Fit {
  const sx = w / Math.max(1, bounds.width);
  const sy = h / Math.max(1, bounds.height);
  const s = Math.min(sx, sy);
  const contentW = bounds.width * s;
  const contentH = bounds.height * s;
  const ox = (w - contentW) / 2 - bounds.x * s;
  const oy = (h - contentH) / 2 - bounds.y * s;
  return { s, ox, oy };
}

export function computeViewportRect(
  containerW: number,
  containerH: number,
  viewScale: number,
  viewTx: number,
  viewTy: number,
  fit: Fit,
): { x: number; y: number; width: number; height: number } {
  const x0 = (0 - viewTx) / viewScale;
  const y0 = (0 - viewTy) / viewScale;
  const vw = containerW / viewScale;
  const vh = containerH / viewScale;
  const mx = fit.ox + x0 * fit.s;
  const my = fit.oy + y0 * fit.s;
  const mw = vw * fit.s;
  const mh = vh * fit.s;
  return { x: mx, y: my, width: mw, height: mh };
}
