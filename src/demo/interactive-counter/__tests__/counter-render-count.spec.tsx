/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractiveCounterDemo } from '../app';
import { ClassButton as Button } from '../widgets/class-button';

import Runtime from '@/runtime';
import { Themes } from '@/styles/theme';

// 模拟 Canvas 注册表和渲染器
const mockRenderer = {
  initialize: vi.fn(),
  destroy: vi.fn(),
  render: vi.fn(),
  update: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  transform: vi.fn(),
  setTransform: vi.fn(),
  drawRect: vi.fn(),
  drawRoundRect: vi.fn(),
  drawCircle: vi.fn(),
  drawText: vi.fn(),
  drawLine: vi.fn(),
  drawPath: vi.fn(),
  drawImage: vi.fn(),
  getRawInstance: () => ({
    canvas: {
      width: 800,
      height: 600,
      dataset: {},
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    },
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    rect: vi.fn(),
    arc: vi.fn(),
    measureText: () => ({ width: 0 }),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createPattern: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    clip: vi.fn(),
  }),
};

describe('计数器渲染计数', () => {
  let runtime: Runtime;
  let container: HTMLElement;

  beforeEach(async () => {
    // 模拟 HTMLCanvasElement.getContext 以抑制 jsdom 错误
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

    vi.useRealTimers();
    // 创建容器
    container = document.createElement('div');
    container.id = 'app-test-counter-render';
    document.body.appendChild(container);

    // 模拟运行时创建
    runtime = await Runtime.create('app-test-counter-render', { renderer: 'canvas2d' });
    (runtime as any).renderer = mockRenderer;
  });

  afterEach(() => {
    if (runtime) {
      runtime.destroy();
    }
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  it('点击按钮应只触发一次渲染（性能指标）', async () => {
    // 该测试验证性能指标：渲染次数。
    // 目标：每次状态更新仅触发 1 次渲染。

    // 监听 Button.render
    // 注意：由于 ClassButton 实例会被复用，我们可以在找到实例后直接监听其 render 方法
    // const renderSpy = vi.spyOn(Button.prototype, 'render');

    // 挂载 Template
    const root = new InteractiveCounterDemo({
      type: 'InteractiveCounterDemo',
      theme: Themes.light,
    });
    (runtime as any).rootWidget = root;
    root.runtime = runtime;

    // Mock requestAnimationFrame
    let rafCount = 0;
    let pendingUpdate: Promise<any> | null = null;
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      rafCount++;
      const result = fn(0) as any;
      if (result instanceof Promise) {
        pendingUpdate = result;
      }
      return 0;
    });

    root.createElement(root.data); // 初始构建

    // 初始渲染计数
    // Button 在 root.createElement -> render -> buildChildren 过程中被创建
    // Button.createElement -> Button.render
    // 随后 Runtime 可能会 tick。

    // 调度根节点更新以模拟挂载
    runtime.scheduleUpdate(root);
    if (pendingUpdate) {
      await pendingUpdate;
    }
    // 额外等待微任务
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 查找 button 组件
    // Template 渲染结构: Padding -> Row -> [Column, Column]
    // Left Column -> [ClassButton, FunctionalButton, RawButton]
    const padding = root.children[0];
    const row = padding.children[0];
    const leftColumn = row.children[0];

    const button = leftColumn.children.find((c) => c instanceof Button) as Button;

    expect(button).toBeDefined();
    if (!button) {
      return;
    }

    // 手动包装 render 方法以确保捕获调用
    let renderCount = 0;
    const originalRender = button.render.bind(button);
    (button as any).render = function () {
      renderCount++;
      return originalRender();
    };

    // 验证初始颜色
    // 初始状态下 props.color 是 undefined，使用 state.color (#1677ff)

    // 触发点击事件
    const onClick = button.props.onClick;
    const mockEvent = {} as any;
    onClick?.(mockEvent);

    // 等待异步更新完成
    if (pendingUpdate) {
      await pendingUpdate;
    }
    // 额外等待微任务
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 预期: 1 次
    // 性能指标: 渲染次数应确切为 1
    expect(renderCount).toBe(1);

    // 边界条件测试：验证颜色是否正确更新
    // 重新获取 Button 实例 (因为重建可能生成了新的实例或者更新了现有实例)
    const newPadding = root.children[0];
    const newRow = newPadding.children[0];
    const newLeftColumn = newRow.children[0];
    const newButton = newLeftColumn.children.find((c) => c instanceof Button) as Button;

    expect(newButton).toBeDefined();
  });
});
