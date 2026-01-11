import { describe, it, expect } from 'vitest';

import { elbowRoute } from '../connection-drawer';

describe('elbowRoute', () => {
  it('在矩形中心之间生成正交路径', () => {
    const a = { x: 10, y: 20, width: 100, height: 40 };
    const b = { x: 300, y: 50, width: 120, height: 60 };
    const pts = elbowRoute(a, b);
    expect(pts.length).toBe(4);
    expect(pts[0]).toEqual({ x: a.x + a.width, y: a.y + a.height / 2 });
    expect(pts[3]).toEqual({ x: b.x, y: b.y + b.height / 2 });
    const mx = (a.x + a.width + b.x) / 2;
    expect(pts[1]).toEqual({ x: mx, y: pts[0].y });
    expect(pts[2]).toEqual({ x: mx, y: pts[3].y });
  });
});
