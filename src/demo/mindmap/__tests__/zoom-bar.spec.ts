import { describe, it, expect } from 'vitest';

import { quantize } from '../components/zoom-bar';

describe('ZoomBar quantize mapping', () => {
  it('maps middle position to mid value', () => {
    const min = 0.1,
      max = 10,
      step = 0.01;
    const width = 200;
    const x = width / 2;
    const r = x / width;
    const target = min + r * (max - min);
    const v = quantize(target, min, max, step);
    expect(v).toBeCloseTo((min + max) / 2, 2);
  });

  it('dragging right increases value', () => {
    const min = 0.1,
      max = 10,
      step = 0.01;
    const width = 200;
    const leftX = 40;
    const rightX = 160;
    const vLeft = quantize(min + (leftX / width) * (max - min), min, max, step);
    const vRight = quantize(min + (rightX / width) * (max - min), min, max, step);
    expect(vRight).toBeGreaterThan(vLeft);
  });

  it('dragging left decreases value', () => {
    const min = 0.1,
      max = 10,
      step = 0.01;
    const width = 200;
    const x1 = 160;
    const x2 = 40;
    const v1 = quantize(min + (x1 / width) * (max - min), min, max, step);
    const v2 = quantize(min + (x2 / width) * (max - min), min, max, step);
    expect(v2).toBeLessThan(v1);
  });

  it('clamps to bounds', () => {
    const min = 0.1,
      max = 10,
      step = 0.01;
    expect(quantize(-123, min, max, step)).toBeCloseTo(min, 2);
    expect(quantize(999, min, max, step)).toBeCloseTo(max, 2);
  });
});
