import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapViewport, type MindMapViewportProps } from '../widgets/mindmap-viewport';

import type { InkwellEvent } from '@/core/events';

import { Widget } from '@/core/base';

// 模拟依赖项
class MockNode extends Widget {
  constructor(key: string, x: number, y: number, w: number, h: number) {
    super({ type: CustomComponentType.MindMapNode, key });
    this.renderObject.offset = { dx: x, dy: y };
    this.renderObject.size = { width: w, height: h };
  }
}

function createViewport(props: Partial<MindMapViewportProps> = {}) {
  const vp = new MindMapViewport({
    width: 800,
    height: 600,
    type: 'MindMapViewport',
    ...props,
  });
  // 布局以确保尺寸正确
  vp.layout({ minWidth: 800, maxWidth: 800, minHeight: 600, maxHeight: 600 });
  return vp;
}

function dispatchEvent(
  vp: MindMapViewport,
  type: string,
  clientX: number,
  clientY: number,
  buttons: number = 1,
) {
  // 模拟 onPointer* 预期的事件对象结构
  const mockEvent = {
    type,
    x: clientX,
    y: clientY,
    nativeEvent: {
      type,
      clientX,
      clientY,
      buttons,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    },
    // 模拟 InkwellEvent 的 stopPropagation
    stopPropagation: vi.fn(),
    // 如果需要，模拟 target/currentTarget
    target: vp,
    currentTarget: vp,
  } as unknown as InkwellEvent;

  // 手动调用处理程序
  if (type === 'pointerdown') {
    vp.onPointerDown(mockEvent);
  }
  if (type === 'pointermove') {
    vp.onPointerMove(mockEvent);
  }
  if (type === 'pointerup') {
    vp.onPointerUp(mockEvent);
  }
}

// 直接设置视口变换以进行测试的辅助函数
function setTransform(
  vp: MindMapViewport,
  scale: number,
  tx: number,
  ty: number,
  scrollX: number,
  scrollY: number,
) {
  // 使用私有属性访问或公共 setter（如果可用）
  // MindMapViewport 有 setPosition/setTransform 但 scroll 是独立的
  (vp as any)._scale = scale;
  (vp as any)._tx = tx;
  (vp as any)._ty = ty;
  (vp as any)._scrollX = scrollX;
  (vp as any)._scrollY = scrollY;
  vp.markDirty(); // 触发更新
}

describe('MindMapViewport 选区精度测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('应该在默认缩放和平移下正确选中节点', () => {
    const vp = createViewport({
      onSetSelectedKeys: vi.fn(),
    });

    // 节点位置 (100, 100) 尺寸 50x50
    const node = new MockNode('n1', 100, 100, 50, 50);
    node.parent = vp;
    vp.children = [node];

    // 从 (90, 90) 拖拽到 (160, 160) -> 选区框: x=90, y=90, w=70, h=70
    // 应该包含节点 (100, 100, 50, 50) - 边界: 100-150
    // 选区矩形: 90-160. 是否包含 100-150? 是。

    // 1. 按下
    dispatchEvent(vp, 'pointerdown', 90, 90);

    // 2. 移动
    dispatchEvent(vp, 'pointermove', 160, 160);

    // 强制触发节流
    vi.advanceTimersByTime(250);

    // 3. 抬起
    dispatchEvent(vp, 'pointerup', 160, 160);

    expect(vp.data.onSetSelectedKeys).toHaveBeenCalledWith(['n1']);
  });

  it('应该在放大 (Scale=2.0) 时正确选中节点', () => {
    const vp = createViewport({
      onSetSelectedKeys: vi.fn(),
    });
    // 设置 Scale=2.0
    setTransform(vp, 2.0, 0, 0, 0, 0);

    // 节点在世界坐标 (100, 100)。
    // 屏幕坐标: (100 * 2, 100 * 2) = (200, 200). 尺寸: 50 * 2 = 100x100.
    // 节点屏幕矩形: 200-300.
    const node = new MockNode('n1', 100, 100, 50, 50);
    node.parent = vp;
    vp.children = [node];

    // 用户在屏幕上从 (190, 190) 拖拽到 (310, 310)。
    // 应该包含节点。

    dispatchEvent(vp, 'pointerdown', 190, 190);
    dispatchEvent(vp, 'pointermove', 310, 310);
    vi.advanceTimersByTime(250);
    dispatchEvent(vp, 'pointerup', 310, 310);

    expect(vp.data.onSetSelectedKeys).toHaveBeenCalledWith(['n1']);
  });

  it('应该在缩小 (Scale=0.5) 时正确选中节点', () => {
    const vp = createViewport({
      onSetSelectedKeys: vi.fn(),
    });
    // 设置 Scale=0.5
    setTransform(vp, 0.5, 0, 0, 0, 0);

    // 节点在世界坐标 (100, 100)。
    // 屏幕坐标: (100 * 0.5, 100 * 0.5) = (50, 50). 尺寸: 25x25.
    // 节点屏幕矩形: 50-75.
    const node = new MockNode('n1', 100, 100, 50, 50);
    node.parent = vp;
    vp.children = [node];

    // 用户在屏幕上从 (40, 40) 拖拽到 (80, 80)。
    // 应该包含节点。

    dispatchEvent(vp, 'pointerdown', 40, 40);
    dispatchEvent(vp, 'pointermove', 80, 80);
    vi.advanceTimersByTime(250);
    dispatchEvent(vp, 'pointerup', 80, 80);

    expect(vp.data.onSetSelectedKeys).toHaveBeenCalledWith(['n1']);
  });

  it('应该在平移 (Pan) 后正确选中节点', () => {
    const vp = createViewport({
      onSetSelectedKeys: vi.fn(),
    });
    // 设置 Tx=100, Ty=100. Scale=1.
    setTransform(vp, 1.0, 100, 100, 0, 0);

    // 节点在世界坐标 (100, 100)。
    // 屏幕坐标: (100 + 100, 100 + 100) = (200, 200).
    // 节点屏幕矩形: 200-250.
    const node = new MockNode('n1', 100, 100, 50, 50);
    node.parent = vp;
    vp.children = [node];

    // 用户在屏幕上从 (190, 190) 拖拽到 (260, 260)。
    dispatchEvent(vp, 'pointerdown', 190, 190);
    dispatchEvent(vp, 'pointermove', 260, 260);
    vi.advanceTimersByTime(250);
    dispatchEvent(vp, 'pointerup', 260, 260);

    expect(vp.data.onSetSelectedKeys).toHaveBeenCalledWith(['n1']);
  });

  class MockContainer extends Widget {
    constructor(key: string) {
      super({ type: 'Container', key });
      this.renderObject.size = { width: 0, height: 0 };
    }
  }

  it('应该在滚动 (Scroll) 后正确选中节点', () => {
    const vp = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      width: 800,
      height: 600,
      scrollX: 50,
      scrollY: 50, // 向下/向右滚动 50
    });

    // 结构: Viewport -> Container -> Node
    // Viewport 设置 Container 偏移为 (-50, -50) 以模拟滚动
    const container = new MockContainer('c1');
    container.parent = vp;
    // 模拟布局：Container 在 Viewport 中的位置应该是 (-scrollX, -scrollY)
    container.renderObject.offset = { dx: -50, dy: -50 };
    vp.children = [container];

    const node = new MockNode('n1', 100, 100, 50, 50);
    node.parent = container;
    container.children = [node];

    // 在屏幕上从 (40, 40) 开始拖拽。
    // Viewport tx=0, ty=0, scale=1.
    // 世界坐标 WorldXY = (40 - 0)/1 + 50 = 90.
    // 矩形起始于 90. 结束于 110+50=160.
    // 选区 World: 90..160.
    // 节点逻辑位置: 100 到 150.
    // 选区包含节点 (90 <= 100 && 150 <= 160).
    // 应该被选中。

    dispatchEvent(vp, 'pointerdown', 40, 40);
    dispatchEvent(vp, 'pointermove', 110, 110);
    dispatchEvent(vp, 'pointerup', 110, 110);

    expect(vp.selectedKeys).toContain('n1');
  });

  it('应该在复合变换 (缩放+平移+滚动) 下正确选中节点', () => {
    const vp = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      width: 800,
      height: 600,
      scale: 2.0,
      tx: 100,
      ty: 100,
      scrollX: 50,
      scrollY: 50,
    });

    // 结构: Viewport -> Container -> Node
    const container = new MockContainer('c1');
    container.parent = vp;
    // 模拟布局：Container 在 Viewport 中的位置应该是 (-scrollX, -scrollY) = (-50, -50)
    container.renderObject.offset = { dx: -50, dy: -50 };
    vp.children = [container];

    const node = new MockNode('n1', 100, 100, 50, 50);
    node.parent = container;
    container.children = [node];

    // 拖拽:
    // 节点 World: 100..150.
    // Scroll: 50.
    // Visual (Pre-Scale/Tx): 100 - 50 = 50.
    // Screen = tx + scale * Visual = 100 + 2 * 50 = 200.
    // Screen Max = 100 + 2 * (150 - 50) = 300.
    // 节点屏幕矩形: 200 到 300.
    // 我们需要拖拽覆盖 (200, 200) 到 (300, 300).

    dispatchEvent(vp, 'pointerdown', 190, 190);
    dispatchEvent(vp, 'pointermove', 310, 310);
    dispatchEvent(vp, 'pointerup', 310, 310);

    expect(vp.selectedKeys).toContain('n1');
  });
});
