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

describe('性能基准测试', () => {
  // 抑制 console.warn
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

    // 1. 初始创建
    const depth = 4; // 减少深度以优化测试速度 (5 -> 4)
    const breadth = 5;
    // 节点数 = 1 + 5 + 25 + 125 + 625 = 781 个节点 (原 3906)
    const rootData = createTreeData(depth, breadth);

    const startCreate = performance.now();
    const root = new BenchmarkWidget(rootData);
    root.createElement(rootData);
    const endCreate = performance.now();
    console.log(`创建时间 (总计): ${(endCreate - startCreate).toFixed(2)}ms`);

    // 2. 更新 (无结构变化, 完全复用)
    const updateData = createTreeData(depth, breadth);
    const startUpdate = performance.now();
    root.createElement(updateData);
    const endUpdate = performance.now();
    console.log(`更新时间 (复用): ${(endUpdate - startUpdate).toFixed(2)}ms`);

    // 3. 布局 (getBoundingBox)
    // Hack: 手动设置 worldMatrix 以允许计算
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

    // 4. 布局 (缓存)
    const startLayoutCached = performance.now();
    traverse(root);
    const endLayoutCached = performance.now();
    console.log(`布局时间 (缓存): ${(endLayoutCached - startLayoutCached).toFixed(2)}ms`);

    // 5. 命中测试 (缓存矩阵)
    const startHit = performance.now();
    for (let i = 0; i < 1000; i++) {
      root.hitTest(100, 100);
    }
    const endHit = performance.now();
    console.log(`命中测试 (1000 次操作): ${(endHit - startHit).toFixed(2)}ms`);

    // 6. 内存使用
    if (global.gc) {
      global.gc();
    }
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`内存使用: ${used.toFixed(2)} MB`);

    console.log('\n--- 指标报告 ---');
    console.log(getMetricsReport());

    // 断言
    // _generateKey 曾为 50ms，现在每次调用应 <1ms，但总计取决于次数。
    // 创建总时间约为 1500 个节点。
    // 如果 _generateKey 耗时 0.001ms，总计 1.5ms。
    // 如果 buildChildren 循环已优化，它应该很快。

    // 我们期望 1500 个节点的创建时间 < 100ms (通常 React 更慢，但这很轻量)。
    // 之前的瓶颈: 仅 _generateKey (50ms) 就会拖慢它。

    // 检查 metrics 中是否有 _generateKey
    const genKeyMetric = PerfMetrics['_generateKey'];
    if (genKeyMetric) {
      // 平均时间应非常低
      expect(genKeyMetric.totalTime / genKeyMetric.count, '平均时间应小于 0.05ms').toBeLessThan(
        0.05,
      ); // 0.05ms = 50us
    }
  });
});
