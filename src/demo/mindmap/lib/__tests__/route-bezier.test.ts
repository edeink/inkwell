import { describe, expect, it } from 'vitest';

import { bezierRoute, elbowRoute } from '../../helpers/connection-drawer';

describe('bezierRoute', () => {
  it('returns smooth points with margins and no straight segments only', () => {
    const a = { x: 10, y: 10, width: 120, height: 40 };
    const b = { x: 260, y: 180, width: 120, height: 40 };
    const pts = bezierRoute(a, b, 18, 6);
    expect(pts.length).toBeGreaterThan(10);
    const start = pts[0];
    const end = pts[pts.length - 1];
    expect(start.x).toBeGreaterThan(a.x + a.width);
    expect(end.x).toBeLessThan(b.x);
    const elbows = elbowRoute(a, b);
    expect(elbows.length).toBeLessThan(pts.length);
  });
});
