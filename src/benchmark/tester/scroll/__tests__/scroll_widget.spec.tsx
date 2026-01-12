/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BENCHMARK_CONFIG } from '../../../utils/config';
import { buildScrollWidgetScene } from '../widget';

// Mock Runtime
const mockRuntime = {
  render: vi.fn(),
  destroy: vi.fn(),
} as any;

// Mock measureNextPaint
vi.mock('../../metrics/collector', () => ({
  measureNextPaint: vi.fn().mockResolvedValue(10),
}));

describe('Scroll Widget Benchmark', () => {
  let stage: HTMLElement;
  let originalRaf: any;

  beforeEach(() => {
    document.body.innerHTML = '';
    stage = document.createElement('div');
    // Set explicit dimensions for stage
    Object.defineProperty(stage, 'clientWidth', { value: 800 });
    Object.defineProperty(stage, 'clientHeight', { value: 600 });

    mockRuntime.render.mockClear();

    // Mock RAF to execute immediately to speed up test
    originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => {
      return setTimeout(cb, 0); // Use timeout to allow promise resolution
    };
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRaf;
  });

  it('should scroll content over time', async () => {
    // Setup config for fast scrolling
    const originalDurationFactor = BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR;
    const originalMinDuration = BENCHMARK_CONFIG.SCROLL.MIN_DURATION;

    BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR = 0.01;
    BENCHMARK_CONFIG.SCROLL.MIN_DURATION = 50; // 50ms duration

    const count = 20; // 1000px content, 600px viewport => 400px scroll

    const result = await buildScrollWidgetScene(stage, mockRuntime, count);

    // Verify results
    expect(result.scrollMetrics.durationMs).toBeGreaterThan(0);
    expect(result.scrollMetrics.totalFrames).toBeGreaterThan(0);

    // Verify render was called multiple times
    expect(mockRuntime.render).toHaveBeenCalled();
    const calls = mockRuntime.render.mock.calls;
    expect(calls.length).toBeGreaterThan(5); // Should have multiple frames

    // Verify scrollY changes
    // Check the argument passed to render in subsequent calls
    const firstRender = calls[0][0]; // Initial tree
    const lastRender = calls[calls.length - 1][0]; // Final tree

    // Note: The object passed to render is the VDOM root.
    // In buildScrollWidgetScene, it returns <ScrollView scrollY={...} ...>
    // We need to check props of the rendered element.

    // Helper to get scrollY from VDOM
    const getScrollY = (vdom: any) => vdom.props.scrollY;

    expect(getScrollY(firstRender)).toBe(0);
    expect(getScrollY(lastRender)).toBeGreaterThan(0);
    // Should reach close to maxScroll (400)
    // The loop breaks when finished, so last render should be maxScroll
    expect(getScrollY(lastRender)).toBeCloseTo(400, -1); // 400 +/- 10

    // Restore config
    BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR = originalDurationFactor;
    BENCHMARK_CONFIG.SCROLL.MIN_DURATION = originalMinDuration;
  });
});
