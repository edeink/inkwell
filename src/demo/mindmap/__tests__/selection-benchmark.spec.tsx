import { describe, expect, it } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import { Widget } from '@/core/base';

class MockNode extends Widget {
  constructor(key: string, x: number, y: number, w: number, h: number) {
    super({ type: CustomComponentType.MindMapNode, key });
    this.renderObject.offset = { dx: x, dy: y };
    this.renderObject.size = { width: w, height: h };
  }
}

describe('MindMapViewport 选区性能测试', () => {
  it('应该高效处理大量节点 (10k)', () => {
    const vp = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      width: 1920,
      height: 1080,
    });

    // 创建 10,000 个节点组成的网格
    const nodes: MockNode[] = [];
    const rows = 100;
    const cols = 100;
    const size = 50;
    const gap = 10;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (size + gap);
        const y = r * (size + gap);
        const node = new MockNode(`n-${r}-${c}`, x, y, size, size);
        node.parent = vp;
        nodes.push(node);
      }
    }
    vp.children = nodes;

    // 测量空间索引构建时间 (Build Spatial Index Time)
    // buildSpatialIndex 是私有方法，但由 onPointerDown 调用
    const t0 = performance.now();
    (vp as any).buildSpatialIndex();
    const t1 = performance.now();
    const buildTime = t1 - t0;

    console.log(`[Perf] 构建空间索引 (10k 节点): ${buildTime.toFixed(2)}ms`);

    // 测量选区更新时间 (Selection Update Time)
    // 模拟覆盖约 25% 节点的选区
    (vp as any)._selectionRect = {
      x: 0,
      y: 0,
      width: (cols / 2) * (size + gap),
      height: (rows / 2) * (size + gap),
    };

    const t2 = performance.now();
    (vp as any).updateSelection();
    const t3 = performance.now();
    const queryTime = t3 - t2;

    console.log(`[Perf] 查询选区 (10k 节点, ~2500 命中): ${queryTime.toFixed(2)}ms`);

    // 断言 (根据环境调整阈值，但目标是构建 < 100ms，查询 < 50ms)
    // 在首次运行/模拟环境中构建可能会稍慢，所以放宽限制
    expect(buildTime).toBeLessThan(100);
    expect(queryTime).toBeLessThan(50);
  });
});
