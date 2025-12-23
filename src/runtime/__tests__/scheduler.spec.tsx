/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Runtime from '../index';

import { Container, StatelessWidget } from '@/core';

// Mock renderer
const mockRenderer = {
  initialize: vi.fn(),
  destroy: vi.fn(),
  render: vi.fn(),
  update: vi.fn(),
  getRawInstance: () => ({
    canvas: { width: 800, height: 600, dataset: {} },
    clearRect: vi.fn(),
  }),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  setTransform: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  drawRect: vi.fn(),
  drawImage: vi.fn(),
  drawText: vi.fn(),
  measureText: () => ({ width: 0 }),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  clear: vi.fn(),
};

class TestWidget extends StatelessWidget {
  protected render() {
    return <Container />;
  }
}

describe('Runtime Scheduler (调度器)', () => {
  let runtime: Runtime;
  let container: HTMLElement;

  beforeEach(async () => {
    // Mock HTMLCanvasElement.getContext to suppress jsdom error
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(0) })),
          putImageData: vi.fn(),
          createImageData: vi.fn(),
          setTransform: vi.fn(),
          drawImage: vi.fn(),
          save: vi.fn(),
          fillText: vi.fn(),
          restore: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          closePath: vi.fn(),
          stroke: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          rotate: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          measureText: vi.fn(() => ({ width: 0 })),
          transform: vi.fn(),
          rect: vi.fn(),
          clip: vi.fn(),
        }) as any,
    );

    vi.useFakeTimers();
    container = document.createElement('div');
    container.id = 'app-test-scheduler';
    document.body.appendChild(container);

    // Mock canvas registry to avoid errors
    const canvas = document.createElement('canvas');
    canvas.dataset.inkwellId = 'test-id';

    runtime = await Runtime.create('app-test-scheduler', { renderer: 'canvas2d' });

    // Inject mock renderer
    (runtime as any).renderer = mockRenderer;
    const root = new TestWidget({ type: 'TestWidget' });
    root.createElement(root.data);
    (runtime as any).rootWidget = root;
    if ((runtime as any).rootWidget) {
      (runtime as any).rootWidget.__runtime = runtime;
    }
  });

  afterEach(() => {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  it('scheduleUpdate 应在下一帧触发 rebuild', async () => {
    const rebuildSpy = vi.spyOn(runtime, 'rebuild').mockImplementation(async () => {
      (runtime as any).dirtyWidgets.clear();
    });
    const widget = new TestWidget({ type: 'TestWidget' });
    widget.createElement(widget.data);

    runtime.scheduleUpdate(widget);

    // 此时不应立即调用
    expect(rebuildSpy).not.toHaveBeenCalled();

    // 执行所有定时器（包含 RAF）
    await vi.runAllTimersAsync();

    expect(rebuildSpy).toHaveBeenCalledTimes(1);
  });

  it('多次 scheduleUpdate 应合并为单次 rebuild (Batching)', async () => {
    const rebuildSpy = vi.spyOn(runtime, 'rebuild').mockImplementation(async () => {
      (runtime as any).dirtyWidgets.clear();
    });
    const widget1 = new TestWidget({ type: 'TestWidget' });
    widget1.createElement(widget1.data);
    const widget2 = new TestWidget({ type: 'TestWidget' });
    widget2.createElement(widget2.data);

    runtime.scheduleUpdate(widget1);
    runtime.scheduleUpdate(widget2);
    runtime.scheduleUpdate(widget1);

    expect(rebuildSpy).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    expect(rebuildSpy).toHaveBeenCalledTimes(1);
    expect((runtime as any).dirtyWidgets.size).toBe(0);
  });

  it('tick 应取消挂起的 RAF 并立即执行', async () => {
    const rebuildSpy = vi.spyOn(runtime, 'rebuild').mockImplementation(async () => {
      (runtime as any).dirtyWidgets.clear();
    });
    const widget = new TestWidget({ type: 'TestWidget' });
    widget.createElement(widget.data);

    runtime.scheduleUpdate(widget);

    // 手动 tick
    runtime.tick();

    // 应立即调用
    expect(rebuildSpy).toHaveBeenCalledTimes(1);

    // 再次运行定时器，确保 RAF 已被取消，不会再次触发
    await vi.runAllTimersAsync();
    expect(rebuildSpy).toHaveBeenCalledTimes(1);
  });

  it('Flush Loop 应处理 rebuild 过程中产生的新更新', async () => {
    let callCount = 0;
    const rebuildSpy = vi.spyOn(runtime, 'rebuild').mockImplementation(async () => {
      (runtime as any).dirtyWidgets.clear();
      callCount++;
      if (callCount === 1) {
        // 模拟在构建过程中产生了新的脏节点
        // 例如：子组件在 build 时触发了状态更新
        const w = new TestWidget({ type: 'TestWidget' });
        w.createElement(w.data);
        runtime.scheduleUpdate(w);
      }
    });

    const w = new TestWidget({ type: 'TestWidget' });
    w.createElement(w.data);
    runtime.scheduleUpdate(w);

    await vi.runAllTimersAsync();

    // 应该调用两次：一次初始，一次 flush loop 处理新增
    expect(rebuildSpy).toHaveBeenCalledTimes(2);
  });

  it('达到最大循环次数应停止并警告 (死循环保护)', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let count = 0;
    const rebuildSpy = vi.spyOn(runtime, 'rebuild').mockImplementation(async () => {
      count++;
      // 每次重建都产生新的脏节点，模拟死循环
      // 限制产生脏节点的次数，防止测试环境真的无限循环（虽然 runtime 有保护，但在某些 mock 场景下更安全）
      if (count < 20) {
        const w = new TestWidget({ type: 'TestWidget' });
        w.createElement(w.data);
        runtime.scheduleUpdate(w);
      }
    });

    const w = new TestWidget({ type: 'TestWidget' });
    w.createElement(w.data);
    runtime.scheduleUpdate(w);

    await vi.runAllTimersAsync();

    // 限制为 10 次
    expect(rebuildSpy).toHaveBeenCalledTimes(10);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Maximum rebuild depth exceeded'),
    );
  });

  it('异常情况下应正确重置调度状态', async () => {
    const rebuildSpy = vi.spyOn(runtime, 'rebuild').mockImplementation(async () => {
      (runtime as any).dirtyWidgets.clear();
      throw new Error('Fail');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const widget = new TestWidget({ type: 'TestWidget' });
    widget.createElement(widget.data);

    runtime.scheduleUpdate(widget);

    await vi.runAllTimersAsync();

    // 检查是否捕获并记录了错误
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Layout update failed'),
      expect.any(Error),
    );

    // 检查内部状态是否重置
    expect((runtime as any).__layoutScheduled).toBe(false);
    expect((runtime as any).__layoutRaf).toBeNull();

    // 应该能够再次调度
    rebuildSpy.mockImplementation(async () => {
      (runtime as any).dirtyWidgets.clear();
    });
    runtime.scheduleUpdate(widget);

    await vi.runAllTimersAsync();
    expect(rebuildSpy).toHaveBeenCalledTimes(2);
  });
});
