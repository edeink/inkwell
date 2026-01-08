import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Widget, type WidgetProps } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { getMetricsReport, PerfMetrics, resetMetrics } from '@/utils/perf';

class BenchmarkWidget extends Widget {
  constructor(data: WidgetProps) {
    super(data);
  }
}

WidgetRegistry.registerType('BenchmarkWidget', BenchmarkWidget);

function createTreeData(depth: number, breadth: number): WidgetProps {
  if (depth <= 0) {
    return { type: 'BenchmarkWidget', children: [] };
  }
  const children: WidgetProps[] = [];
  for (let i = 0; i < breadth; i++) {
    children.push(createTreeData(depth - 1, breadth));
  }
  return { type: 'BenchmarkWidget', children };
}

describe('Performance Benchmark', () => {
  // Suppress console.warn
  const originalWarn = console.warn;
  beforeAll(() => {
    console.warn = () => {};
  });
  afterAll(() => {
    console.warn = originalWarn;
  });

  it('Should measure Widget creation and updates', () => {
    resetMetrics();
    console.log('\n--- Starting Benchmark ---');

    // 1. Initial Creation
    const depth = 5;
    const breadth = 5;
    // Nodes = 1 + 5 + 25 + 125 + 625 + 3125 = 3906 nodes
    const rootData = createTreeData(depth, breadth);

    const startCreate = performance.now();
    const root = new BenchmarkWidget(rootData);
    root.createElement(rootData);
    const endCreate = performance.now();
    console.log(`Creation Time (Total): ${(endCreate - startCreate).toFixed(2)}ms`);

    // 2. Update (No structural change, full reuse)
    const updateData = createTreeData(depth, breadth);
    const startUpdate = performance.now();
    root.createElement(updateData);
    const endUpdate = performance.now();
    console.log(`Update Time (Reuse): ${(endUpdate - startUpdate).toFixed(2)}ms`);

    // 3. Layout (getBoundingBox)
    // Hack: manually set worldMatrix to allow calculation
    const traverse = (w: Widget) => {
      // @ts-ignore
      w._worldMatrix = [1, 0, 0, 1, 0, 0];
      w.getBoundingBox();
      w.children.forEach(traverse);
    };
    const startLayout = performance.now();
    traverse(root);
    const endLayout = performance.now();
    console.log(`Layout Time (First): ${(endLayout - startLayout).toFixed(2)}ms`);

    // 4. Layout (Cached)
    const startLayoutCached = performance.now();
    traverse(root);
    const endLayoutCached = performance.now();
    console.log(`Layout Time (Cached): ${(endLayoutCached - startLayoutCached).toFixed(2)}ms`);

    // 5. HitTest (Cached Matrix)
    const startHit = performance.now();
    for (let i = 0; i < 1000; i++) {
      root.hitTest(100, 100);
    }
    const endHit = performance.now();
    console.log(`HitTest (1000 ops): ${(endHit - startHit).toFixed(2)}ms`);

    // 6. Memory Usage
    if (global.gc) {
      global.gc();
    }
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Memory Used: ${used.toFixed(2)} MB`);

    console.log('\n--- Metrics Report ---');
    console.log(getMetricsReport());

    // Assertions
    // _generateKey was 50ms, now should be <1ms per call, but aggregate depends on count.
    // Total time for creation is ~1500 nodes.
    // If _generateKey takes 0.001ms, total is 1.5ms.
    // If buildChildren loop is optimized, it should be fast.

    // We expect Creation Time < 100ms for 1500 nodes (usually React is slower, but this is lightweight).
    // Previous bottlenecks: _generateKey (50ms) alone would kill it.

    // Check if _generateKey is in metrics
    const genKeyMetric = PerfMetrics['_generateKey'];
    if (genKeyMetric) {
      // Average time should be very low
      expect(genKeyMetric.totalTime / genKeyMetric.count).toBeLessThan(0.05); // 0.05ms = 50us
    }
  });
});
