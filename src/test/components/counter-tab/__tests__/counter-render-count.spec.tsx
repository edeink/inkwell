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

  it('Button should render only once per click (Performance Metric)', async () => {
    // This test verifies the performance metric: Render Count.
    // Goal: 1 render per state update.

    // Mock HTMLCanvasElement.getContext to suppress jsdom error
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
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
    })) as any;

    // Spy on Button.render
    const renderSpy = vi.spyOn(Button.prototype, 'render');

    // Mount Template
    const root = new Template({ type: 'Template' });
    (runtime as any).rootWidget = root;
    root.__runtime = runtime;
    root.createElement(root.data); // Initial build

    // Initial render count
    // Button is created during root.createElement -> render -> buildChildren
    // Button.createElement -> Button.render
    // Then Runtime might tick.

    // Let's schedule update for root to simulate proper mounting
    runtime.scheduleUpdate(root);
    await vi.runAllTimersAsync();

    // Reset spy after initial mount
    renderSpy.mockClear();

    // Find the button widget
    // The Template renders: Row -> [Button, Container, Text]
    // Button -> Container
    const row = root.children[0]; // Row
    const button = row.children.find((c) => c instanceof Button);

    expect(button).toBeDefined();
    if (!button) {
      return;
    }

    // Simulate click on Button
    // Button wraps Container. Container has onClick.
    // In button.tsx: <Container onClick={this.props.onClick}>
    const btnContainer = button.children[0];
    const clickHandler = (btnContainer.data as any).onClick;

    expect(typeof clickHandler).toBe('function');

    // Trigger click
    clickHandler({} as any);

    // Wait for updates
    await vi.runAllTimersAsync();

    // Check render count
    // Expected: 1
    // Performance Metric: Render count should be exactly 1
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
