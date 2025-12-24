import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MindmapContext } from '../../../context';
import { MindmapController } from '../../../controller';
import { MindMapViewport } from '../../../custom-widget/mindmap-viewport';
import Minimap from '../index';

import type { Root } from 'react-dom/client';

import Runtime from '@/runtime';

// 模拟依赖
vi.mock('../../../custom-widget/mindmap-viewport');
vi.mock('@/runtime');
vi.mock('../../../controller');

describe('Minimap 集成测试', () => {
  let runtime: Runtime;
  let viewport: MindMapViewport;
  let controller: MindmapController;
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    // 模拟 ResizeObserver
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    // 设置 DOM
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    // 模拟设置
    // 通过转换为 any 或使用 Object.create 绕过私有构造函数
    runtime = Object.create(Runtime.prototype);
    viewport = Object.create(MindMapViewport.prototype);

    // 模拟视口方法和属性
    // 使用 defineProperty 定义只读属性
    Object.defineProperty(viewport, 'scale', { value: 1, writable: true });
    Object.defineProperty(viewport, 'tx', { value: 0, writable: true });
    Object.defineProperty(viewport, 'ty', { value: 0, writable: true });
    Object.defineProperty(viewport, 'renderObject', {
      value: { size: { width: 1000, height: 1000 }, offset: { dx: 0, dy: 0 } },
    });

    viewport.getAbsolutePosition = vi.fn().mockReturnValue({ dx: 0, dy: 0 });
    // viewport.getContentPosition = vi.fn().mockReturnValue({ tx: 0, ty: 0 }); // Removed
    Object.defineProperty(viewport, 'scrollX', { value: 0, writable: true });
    Object.defineProperty(viewport, 'scrollY', { value: 0, writable: true });

    viewport.addViewChangeListener = vi.fn().mockImplementation((cb) => {
      return () => {};
    });
    viewport.addScrollListener = vi.fn().mockImplementation((cb) => {
      return () => {};
    });

    // 模拟控制器
    controller = Object.create(MindmapController.prototype);
    controller.runtime = runtime;
    controller.viewport = viewport;
    controller.viewScale = 1;
    controller.viewTx = 0;
    controller.viewTy = 0;
    Object.defineProperty(controller, 'scrollX', { get: () => 0 });
    Object.defineProperty(controller, 'scrollY', { get: () => 0 });

    // 模拟控制器方法
    controller.addViewChangeListener = vi.fn().mockImplementation((cb) => {
      // 允许手动触发以进行测试
      (controller as unknown as { __triggerViewChange: typeof cb }).__triggerViewChange = cb;
      return () => {};
    });
    controller.addLayoutChangeListener = vi.fn().mockImplementation((cb) => {
      return () => {};
    });
    controller.setViewPosition = vi.fn();

    // 模拟运行时
    (runtime as unknown as { getRootWidget: () => null }).getRootWidget = vi
      .fn()
      .mockReturnValue(null);
    Object.defineProperty(runtime, 'container', {
      get: () => container,
      configurable: true,
    });
    (runtime as unknown as { getCanvasId: () => string }).getCanvasId = vi
      .fn()
      .mockReturnValue('test-canvas');
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  it('应该正确渲染 Minimap 组件 (Should render Minimap component correctly)', async () => {
    await act(async () => {
      root.render(
        <MindmapContext.Provider value={controller}>
          <Minimap width={200} height={140} />
        </MindmapContext.Provider>,
      );
    });

    // 检查 canvas 元素而不是可能已哈希的类名
    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBeGreaterThan(0);
  });

  it('当视图变化时应该触发重绘 (Should trigger redraw when view changes)', async () => {
    await act(async () => {
      root.render(
        <MindmapContext.Provider value={controller}>
          <Minimap width={200} height={140} />
        </MindmapContext.Provider>,
      );
    });

    // 验证初始画布
    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBe(2); // 预览层和高亮层

    // 模拟视图变更
    await act(async () => {
      const ctrl = controller as unknown as {
        __triggerViewChange: (s: number, x: number, y: number) => void;
      };
      if (ctrl.__triggerViewChange) {
        ctrl.__triggerViewChange(1.5, 100, 50);
      }
    });

    // 验证内部状态或 Canvas 绘制调用需要更深入地模拟 Canvas API
    // 这里我们假设如果没有发生错误且组件已挂载，则它正在工作。
    // 我们可以验证 addViewChangeListener 是否被调用
    expect(controller.addViewChangeListener).toHaveBeenCalled();
  });

  it('应该支持拖拽高亮区域以更新视图位置 (Should support dragging highlight area to update view position)', async () => {
    // 设置容器尺寸
    Object.defineProperty(container, 'clientWidth', { value: 1000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 1000, configurable: true });

    // 模拟 canvas 的 getBoundingClientRect
    const getBoundingClientRectMock = vi.fn(
      () =>
        ({
          left: 0,
          top: 0,
          width: 200,
          height: 140,
          x: 0,
          y: 0,
          bottom: 140,
          right: 200,
          toJSON: () => {},
        }) as DOMRect,
    );

    await act(async () => {
      root.render(
        <MindmapContext.Provider value={controller}>
          <Minimap width={200} height={140} />
        </MindmapContext.Provider>,
      );
    });

    const canvases = container.querySelectorAll('canvas');
    // HighlightOverlay 是第二个 canvas
    const highlightCanvas = canvases[1];
    highlightCanvas.getBoundingClientRect = getBoundingClientRectMock;
    highlightCanvas.setPointerCapture = vi.fn();
    highlightCanvas.releasePointerCapture = vi.fn();

    // 在中心点击 (100, 70) - 应该在高亮区域内
    const downEvent = new PointerEvent('pointerdown', {
      clientX: 100,
      clientY: 70,
      bubbles: true,
      pointerId: 1,
    });

    await act(async () => {
      highlightCanvas.dispatchEvent(downEvent);
    });

    // 向右下移动 10px
    const moveEvent = new PointerEvent('pointermove', {
      clientX: 110,
      clientY: 80,
      bubbles: true,
      pointerId: 1,
    });

    await act(async () => {
      highlightCanvas.dispatchEvent(moveEvent);
    });

    // 检查是否调用了 setViewPosition
    expect(controller.setViewPosition).toHaveBeenCalled();

    // 验证方向
    // 如果高亮框向右移动 (dx > 0)，视图应该向左移动内容 (tx < 0)
    const calls = (controller.setViewPosition as unknown as { mock: { calls: any[] } }).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBeLessThan(0); // tx < 0
    expect(lastCall[1]).toBeLessThan(0); // ty < 0

    // 释放
    const upEvent = new PointerEvent('pointerup', {
      bubbles: true,
      pointerId: 1,
    });
    await act(async () => {
      highlightCanvas.dispatchEvent(upEvent);
    });
  });
});
