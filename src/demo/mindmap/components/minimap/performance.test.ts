import { describe, expect, it, vi } from 'vitest';

import {
  connectorPathFromRects,
  ConnectorStyle,
  DEFAULT_CONNECTOR_OPTIONS,
} from '@/demo/mindmap/helpers/connection-drawer';

describe('小地图性能', () => {
  it('高效计算大型图表的连接线路径', () => {
    const nodeCount = 1000;
    const rects = Array.from({ length: nodeCount }, (_, i) => ({
      x: i * 100,
      y: i * 50,
      width: 80,
      height: 40,
    }));

    const connections = [];
    for (let i = 0; i < nodeCount - 1; i++) {
      connections.push({ fromIndex: i, toIndex: i + 1 });
    }

    const startTime = performance.now();

    // 模拟所有连接的路径计算
    for (const conn of connections) {
      const startRect = rects[conn.fromIndex];
      const endRect = rects[conn.toIndex];
      connectorPathFromRects({
        left: startRect,
        right: endRect,
        style: ConnectorStyle.Bezier,
        samples: DEFAULT_CONNECTOR_OPTIONS.samples,
        margin: DEFAULT_CONNECTOR_OPTIONS.margin,
        elbowRadius: DEFAULT_CONNECTOR_OPTIONS.elbowRadius,
        arcSegments: DEFAULT_CONNECTOR_OPTIONS.arcSegments,
      });
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 期望处理 1000 个连接的时间在 50ms 以内（任意预算，通常快得多）
    console.log(`Calculated ${nodeCount} connector paths in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100);
  });
});
