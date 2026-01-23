/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractiveCounterDemo } from '../app';
import { ClassButton as Button } from '../widgets/class-button';
import { PerformanceMonitor } from '../widgets/performance-monitor';

import { Text } from '@/core';
import Runtime from '@/runtime';
import { Themes } from '@/styles/theme';

function findWidget<T>(root: any, predicate: (node: any) => boolean): T | null {
  if (!root) {
    return null;
  }
  if (predicate(root)) {
    return root as T;
  }

  // @ts-ignore
  const children = root.children || (root.child ? [root.child] : []);
  for (const child of children) {
    const found = findWidget<T>(child, predicate);
    if (found) {
      return found;
    }
  }
  return null;
}

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

describe('PerformanceMonitor Erratic Text Reproduction', () => {
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
    container.id = 'app-test-repro';
    document.body.appendChild(container);

    runtime = await Runtime.create('app-test-repro', { renderer: 'canvas2d' });
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

  it('should maintain stable Text widget identity on updates', async () => {
    const root = new InteractiveCounterDemo({
      type: 'InteractiveCounterDemo',
      theme: Themes.light,
    });
    (runtime as any).rootWidget = root;
    root.runtime = runtime;

    // Mock rAF
    let lastTickPromise: Promise<any> | null = null;
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      setTimeout(() => {
        const result = fn(performance.now()) as any;
        if (result instanceof Promise) {
          lastTickPromise = result;
        }
      }, 0);
      return 0;
    });

    // Initial mount
    root.createElement(root.data);
    runtime.scheduleUpdate(root);

    await new Promise((resolve) => setTimeout(resolve, 0));
    if (lastTickPromise) {
      await lastTickPromise;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Find PerformanceMonitor
    const monitor = findWidget<PerformanceMonitor>(
      root,
      (node) => node instanceof PerformanceMonitor,
    );
    expect(monitor).toBeInstanceOf(PerformanceMonitor);
    if (!monitor) {
      return;
    }

    // Get Text widgets
    const monitorColumn = monitor.children[0].children[0]; // Container -> Column
    const texts = monitorColumn.children.filter((c) => c instanceof Text) as Text[];

    // There should be 3 texts: External, Inner, Render
    expect(texts.length).toBe(3);
    const [textExt1, textInner1, textRender1] = texts;

    // Click button to trigger update
    const button = findWidget<Button>(root, (node) => node instanceof Button);
    expect(button).toBeDefined();
    if (!button) {
      return;
    }
    // Trigger click
    button.props.onClick?.({} as any);

    // Wait for update
    runtime.scheduleUpdate(root);
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (lastTickPromise) {
      await lastTickPromise;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Get new Text widgets
    const monitor2 = findWidget<PerformanceMonitor>(
      root,
      (node) => node instanceof PerformanceMonitor,
    );
    // Monitor instance might be reused if it's a StatefulWidget and key didn't change (it has static key 'perf-monitor')
    expect(monitor2).toBe(monitor);
    if (!monitor2) {
      return;
    }

    const monitorColumn2 = monitor2.children[0].children[0];
    const texts2 = monitorColumn2.children.filter((c) => c instanceof Text) as Text[];
    const [textExt2, textInner2, textRender2] = texts2;

    // Verify identity stability
    // With stable keys, these assertions should PASS (Text widget instances are reused)
    expect(textExt2).toBe(textExt1);
    expect(textInner2).toBe(textInner1);
    expect(textRender2).toBe(textRender1);
  });
});
