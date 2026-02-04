/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapNode } from '../widgets/mindmap-node';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import { dispatchToTree } from '@/core/events';

// 模拟 Node
class MockNode extends MindMapNode {
  constructor(key: string, x: number, y: number, w: number, h: number) {
    super({ key, title: key } as any);
    this.key = key;
    this.type = CustomComponentType.MindMapNode;
    this.renderObject = {
      offset: { dx: x, dy: y },
      size: { width: w, height: h },
    };
  }
}

describe('MindMapViewport 选区测试', () => {
  let vp: MindMapViewport;
  let onSetSelectedKeys: any;

  beforeEach(() => {
    vi.useFakeTimers();
    onSetSelectedKeys = vi.fn();
    vp = new MindMapViewport({
      width: 800,
      height: 600,
      onSetSelectedKeys,
    });
    vp.key = 'viewport';
    vp.renderObject = {
      offset: { dx: 0, dy: 0 },
      size: { width: 800, height: 600 },
    };
    (vp as any).__root = vp;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('应选中包含的节点 (从左向右拖拽)', () => {
    // 节点 1: (100, 100) 50x50
    const n1 = new MockNode('n1', 100, 100, 50, 50);
    // 节点 2: (200, 100) 50x50
    const n2 = new MockNode('n2', 200, 100, 50, 50);

    vp.children = [n1, n2];
    n1.parent = vp;
    n2.parent = vp;

    // 在 (50, 50) 开始选择
    dispatchToTree(vp, vp, 'pointerdown', 50, 50, { buttons: 1 } as any);

    // 拖拽到 (180, 180). 矩形: x=50, y=50, w=130, h=130.
    // n1 (100, 100, 150, 150) 在内部。
    // n2 (200, 100, 250, 150) 在外部 (minX 200 > maxX 180).

    dispatchToTree(vp, vp, 'pointermove', 180, 180, { buttons: 1 } as any);

    // 推进时间以触发节流
    vi.advanceTimersByTime(250);

    // 期望 n1 被选中，n2 未选中
    expect(onSetSelectedKeys).toHaveBeenCalledWith(['n1']);
  });

  it('应选中相交的节点 (从右向左拖拽)', () => {
    // 节点 1: (100, 100) 50x50
    const n1 = new MockNode('n1', 100, 100, 50, 50);

    vp.children = [n1];
    n1.parent = vp;

    // 在 (120, 120) 开始选择 (在 n1 内部)
    dispatchToTree(vp, vp, 'pointerdown', 120, 120, { buttons: 1 } as any);

    // 拖拽到 (50, 50). 矩形: x=50, y=50, w=70, h=70 (标准化后).
    // 原始拖拽为 120 -> 50 (delta -70).
    // 宽度 < 0 => 相交模式 (Intersect Mode).

    // 选区矩形标准化后: (50, 50) 到 (120, 120).
    // n1 矩形: (100, 100) 到 (150, 150).
    // 相交? 是的。

    dispatchToTree(vp, vp, 'pointermove', 50, 50, { buttons: 1 } as any);

    vi.advanceTimersByTime(250);

    expect(onSetSelectedKeys).toHaveBeenCalledWith(['n1']);
  });

  it('在包含模式下不应选中部分包含的节点', () => {
    const n1 = new MockNode('n1', 100, 100, 50, 50);
    vp.children = [n1];
    n1.parent = vp;

    // 开始 (110, 110) 在节点内部
    dispatchToTree(vp, vp, 'pointerdown', 110, 110, { buttons: 1 } as any);

    // 拖拽到 (200, 200). 宽度 > 0 => 包含模式 (Contain Mode).
    // 矩形: (110, 110) 到 (200, 200).
    // n1 是 (100, 100) 到 (150, 150).
    // n1 minX (100) < 矩形 minX (110).
    // 所以 n1 没有完全在内部。

    dispatchToTree(vp, vp, 'pointermove', 200, 200, { buttons: 1 } as any);

    vi.advanceTimersByTime(250);

    expect(onSetSelectedKeys).toHaveBeenCalledWith([]);
  });

  it('应正确处理缩放', () => {
    const n1 = new MockNode('n1', 100, 100, 50, 50);
    vp.children = [n1];
    n1.parent = vp;

    // 设置缩放为 2.0
    // Viewport 变换: scale=2, tx=0, ty=0.
    // Viewport.getWorldXY 逻辑:
    // World = (Screen - tx) / scale + scroll

    // 通过 prop 设置 scale (重新初始化) 或修改内部状态
    (vp as any)._scale = 2.0;

    // 我们想要在世界坐标中选中 n1 (100, 100, 150, 150)。
    // 需要屏幕坐标?
    // 如果我们在屏幕 (200, 200) 点击。
    // World = (200 - 0) / 2 = 100.

    // 从屏幕 (180, 180) 开始 -> World (90, 90).
    dispatchToTree(vp, vp, 'pointerdown', 180, 180, { buttons: 1 } as any);

    // 拖拽到屏幕 (320, 320) -> World (160, 160).
    // 矩形 World: (90, 90) 到 (160, 160).
    // 宽度 > 0 => 包含模式。
    // n1 (100, 100, 150, 150) 在 (90, 90, 160, 160) 内部。

    dispatchToTree(vp, vp, 'pointermove', 320, 320, { buttons: 1 } as any);

    vi.advanceTimersByTime(250);

    expect(onSetSelectedKeys).toHaveBeenCalledWith(['n1']);
  });
});
