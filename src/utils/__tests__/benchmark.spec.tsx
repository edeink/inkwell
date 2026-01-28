/** @jsxImportSource @/utils/compiler */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Widget, type WidgetProps } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';
import { getMetricsReport, PerfMetrics, resetMetrics } from '@/utils/perf';

class BenchmarkWidget extends Widget {
  constructor(data: WidgetProps) {
    super(data);
  }
}

WidgetRegistry.registerType('BenchmarkWidget', BenchmarkWidget);

function buildTreeJSX(depth: number, breadth: number) {
  if (depth <= 0) {
    return <BenchmarkWidget />;
  }
  const children = Array.from({ length: breadth }, () => buildTreeJSX(depth - 1, breadth));
  return <BenchmarkWidget>{children}</BenchmarkWidget>;
}

describe('性能基准测试', () => {
  const originalWarn = console.warn;
  beforeAll(() => {
    console.warn = () => {};
  });
  afterAll(() => {
    console.warn = originalWarn;
  });

  it('应测量 Widget 创建和更新性能', () => {
    resetMetrics();
    console.log('\n--- 开始基准测试 ---');

    const depth = 4;
    const breadth = 5;
    const rootData = compileElement(buildTreeJSX(depth, breadth)) as unknown as WidgetProps;

    const startCreate = performance.now();
    const root = new BenchmarkWidget(rootData);
    root.createElement(rootData);
    const endCreate = performance.now();
    console.log(`创建时间 (总计): ${(endCreate - startCreate).toFixed(2)}ms`);

    const updateData = compileElement(buildTreeJSX(depth, breadth)) as unknown as WidgetProps;
    const startUpdate = performance.now();
    root.createElement(updateData);
    const endUpdate = performance.now();
    console.log(`更新时间 (复用): ${(endUpdate - startUpdate).toFixed(2)}ms`);

    const traverse = (w: Widget) => {
      // @ts-ignore
      w._worldMatrix = [1, 0, 0, 1, 0, 0];
      w.getBoundingBox();
      w.children.forEach(traverse);
    };
    const startLayout = performance.now();
    traverse(root);
    const endLayout = performance.now();
    console.log(`布局时间 (首次): ${(endLayout - startLayout).toFixed(2)}ms`);

    const startLayoutCached = performance.now();
    traverse(root);
    const endLayoutCached = performance.now();
    console.log(`布局时间 (缓存): ${(endLayoutCached - startLayoutCached).toFixed(2)}ms`);

    const startHit = performance.now();
    for (let i = 0; i < 1000; i++) {
      root.hitTest(100, 100);
    }
    const endHit = performance.now();
    console.log(`命中测试 (1000 次操作): ${(endHit - startHit).toFixed(2)}ms`);

    if (global.gc) {
      global.gc();
    }
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`内存使用: ${used.toFixed(2)} MB`);

    console.log('\n--- 指标报告 ---');
    console.log(getMetricsReport());

    const genKeyMetric = PerfMetrics['_generateKey'];
    if (genKeyMetric) {
      expect(genKeyMetric.totalTime / genKeyMetric.count, '平均时间应小于 0.05ms').toBeLessThan(
        0.05,
      );
    }
  });
});
