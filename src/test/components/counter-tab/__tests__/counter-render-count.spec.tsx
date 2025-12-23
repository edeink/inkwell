/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../button';
import { Template } from '../counter';

import Runtime from '@/runtime';

// Mock canvas registry and renderer
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

describe('Counter Render Count', () => {
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
    container.id = 'app-test-counter-render';
    document.body.appendChild(container);

    // Mock runtime creation
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
    const renderSpy = vi.spyOn(Button.prototype, 'render');

    // 挂载 Template
    const root = new Template({ type: 'Template' });
    (runtime as any).rootWidget = root;
    root.runtime = runtime;
    root.createElement(root.data); // 初始构建

    // 初始渲染计数
    // Button 在 root.createElement -> render -> buildChildren 过程中被创建
    // Button.createElement -> Button.render
    // 随后 Runtime 可能会 tick。

    // 调度根节点更新以模拟挂载
    runtime.scheduleUpdate(root);
    await vi.runAllTimersAsync();

    // 初始挂载后重置 spy
    renderSpy.mockClear();

    // 查找 button 组件
    // Template 渲染结构: Row -> [Button, Container, Text]
    // Button -> Container
    const row = root.children[0]; // Row
    const button = row.children.find((c) => c instanceof Button) as Button;

    expect(button).toBeDefined();
    if (!button) {
      return;
    }

    // 验证初始颜色
    // 初始状态下 props.color 是 undefined，使用 state.color (#1677ff)

    // 模拟点击 Button
    // Button 包裹 Container。Container 有 onClick。
    // 在 button.tsx 中: <Container onClick={this.props.onClick}>
    const btnContainer = button.children[0];
    const clickHandler = (btnContainer.data as any).onClick;

    expect(typeof clickHandler).toBe('function');

    // 触发点击
    clickHandler({} as any);

    // 等待更新
    await vi.runAllTimersAsync();

    // 检查渲染次数
    // 预期: 1 次
    // 性能指标: 渲染次数应确切为 1
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // 边界条件测试：验证颜色是否正确更新
    // 重新获取 Button 实例 (因为重建可能生成了新的实例或者更新了现有实例)
    const newRow = root.children[0]; // Row
    const newButton = newRow.children.find((c) => c instanceof Button) as Button;

    expect(newButton).toBeDefined();

    // 下一个颜色应该是 #52c41a (初始 #1677ff -> index 0 -> next index 1)
    const displayColor = (newButton.state as any).color;
    expect(displayColor).toBe('#52c41a');
  });
});
