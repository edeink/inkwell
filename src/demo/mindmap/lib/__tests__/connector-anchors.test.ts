import { describe, expect, it } from 'vitest';

import { connectorPathFromRects, ConnectorStyle } from '@/demo/mindmap/helpers/connection-drawer';

const A = { x: 100, y: 100, width: 80, height: 40 };
const B = { x: 20, y: 120, width: 60, height: 30 };
const C = { x: 220, y: 120, width: 60, height: 30 };

describe('连接线锚点计算', () => {
  it('从左到右应连接左侧节点的右边缘与右侧节点的左边缘 (margin=0)', () => {
    // Choose B as left, A as right (B.x < A.x)
    const pts = connectorPathFromRects({
      left: B,
      right: A,
      style: ConnectorStyle.Elbow,
      margin: 0,
    });
    const first = pts[0];
    const last = pts[pts.length - 1];
    expect(first.x).toBeCloseTo(B.x + B.width, 5);
    expect(first.y).toBeCloseTo(B.y + B.height / 2, 5);
    expect(last.x).toBeCloseTo(A.x, 5);
    expect(last.y).toBeCloseTo(A.y + A.height / 2, 5);
  });

  it('从右到左应连接左侧节点的右边缘与右侧节点的左边缘 (margin=0)', () => {
    // Choose A as left, C as right (A.x < C.x)
    const pts = connectorPathFromRects({
      left: A,
      right: C,
      style: ConnectorStyle.Elbow,
      margin: 0,
    });
    const first = pts[0];
    const last = pts[pts.length - 1];
    expect(first.x).toBeCloseTo(A.x + A.width, 5);
    expect(first.y).toBeCloseTo(A.y + A.height / 2, 5);
    expect(last.x).toBeCloseTo(C.x, 5);
    expect(last.y).toBeCloseTo(C.y + C.height / 2, 5);
  });
});
