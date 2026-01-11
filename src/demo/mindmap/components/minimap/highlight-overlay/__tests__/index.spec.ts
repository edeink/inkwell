import { describe, expect, it } from 'vitest';

import { computeViewportRect, fitBounds } from '../../utils';

describe('小地图核心坐标转换', () => {
  it('fitBounds 应正确计算缩放比例和偏移量', () => {
    const bounds = { x: 100, y: 50, width: 300, height: 200 };
    const w = 200;
    const h = 100;
    const fit = fitBounds(bounds, w, h);
    expect(fit.s).toBeCloseTo(0.5, 5);
    expect(fit.ox).toBeCloseTo(-25, 5);
    expect(fit.oy).toBeCloseTo(-25, 5);
  });

  it('computeViewportRect 应将视口映射到小地图矩形', () => {
    const containerW = 800;
    const containerH = 600;
    const viewScale = 2;
    const viewTx = 100;
    const viewTy = 50;
    const fit = { s: 0.5, ox: -25, oy: -25 };
    const rect = computeViewportRect(containerW, containerH, viewScale, viewTx, viewTy, 0, 0, fit);
    expect(rect.x).toBeCloseTo(-50, 5);
    expect(rect.y).toBeCloseTo(-37.5, 5);
    expect(rect.width).toBeCloseTo(200, 5);
    expect(rect.height).toBeCloseTo(150, 5);
  });
});
