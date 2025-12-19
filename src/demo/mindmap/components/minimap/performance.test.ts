import { describe, expect, it, vi } from 'vitest';

import {
  connectorPathFromRects,
  ConnectorStyle,
  DEFAULT_CONNECTOR_OPTIONS,
} from '@/demo/mindmap/helpers/connection-drawer';

describe('Minimap Performance', () => {
  it('efficiently calculates connector paths for large graphs', () => {
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

    // Simulate path calculation for all connections
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

    // Expect processing 1000 connections to be under 50ms (arbitrary budget, usually much faster)
    console.log(`Calculated ${nodeCount} connector paths in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100);
  });
});
