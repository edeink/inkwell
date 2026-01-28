/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClassButton } from '../widgets/class-button';

import { Text } from '@/core';
import { dispatchAt } from '@/core/events/dispatcher';
import Runtime from '@/runtime';
import { Themes } from '@/styles/theme';

// Mock Canvas Renderer
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

describe('ClassButton Event Triggering', () => {
  let runtime: Runtime;
  let container: HTMLElement;

  beforeEach(async () => {
    // Mock HTMLCanvasElement.getContext
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
    container = document.createElement('div');
    container.id = 'app-test-class-button';
    document.body.appendChild(container);

    runtime = await Runtime.create('app-test-class-button', { renderer: 'canvas2d' });
    (runtime as any).renderer = mockRenderer;

    // Mock rAF
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      setTimeout(() => {
        fn(performance.now());
      }, 0);
      return 0;
    });
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

  it('should trigger onClick exactly once when clicked', async () => {
    const onClick = vi.fn();

    // 使用 ClassButton 包装一个 Text
    const root = new ClassButton({
      theme: Themes.light,
      onClick,
      children: <Text key="counter-btn-text" text="Click Me" />,
    });

    (runtime as any).rootWidget = root;
    root.runtime = runtime;

    // Initial layout
    root.createElement(root.data);
    runtime.scheduleUpdate(root);

    // Wait for layout
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate click at (10, 10) - assuming button is at top-left
    // ClassButton creates a Container with 180x48 size
    dispatchAt(runtime, 'click', {
      clientX: 10,
      clientY: 10,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should handle rapid clicks correctly', async () => {
    const onClick = vi.fn();

    const root = new ClassButton({
      theme: Themes.light,
      onClick,
      children: <Text key="counter-btn-text" text="Click Me" />,
    });

    (runtime as any).rootWidget = root;
    root.runtime = runtime;
    root.createElement(root.data);
    runtime.scheduleUpdate(root);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Rapid clicks
    for (let i = 0; i < 3; i++) {
      dispatchAt(runtime, 'click', {
        clientX: 10,
        clientY: 10,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as any);
    }

    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it('should maintain single trigger after re-render', async () => {
    const onClick = vi.fn();

    const root = new ClassButton({
      theme: Themes.light,
      onClick,
      children: <Text key="counter-btn-text" text="Click Me" />,
    });

    (runtime as any).rootWidget = root;
    root.runtime = runtime;
    root.createElement(root.data);
    runtime.scheduleUpdate(root);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // First click
    dispatchAt(runtime, 'click', {
      clientX: 10,
      clientY: 10,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any);
    expect(onClick).toHaveBeenCalledTimes(1);

    // Update props (trigger re-render)
    root.createElement({
      ...root.data,
      children: <Text key="counter-btn-text" text="Clicked!" />,
    });
    runtime.scheduleUpdate(root);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Second click after re-render
    dispatchAt(runtime, 'click', {
      clientX: 10,
      clientY: 10,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as any);

    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
