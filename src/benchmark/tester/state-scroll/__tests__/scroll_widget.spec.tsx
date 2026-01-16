/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BENCHMARK_CONFIG } from '../../../utils/config';
import { buildScrollWidgetScene } from '../widget';

const mockRuntime = {
  render: vi.fn(),
  destroy: vi.fn(),
} as any;

vi.mock('../../metrics/collector', () => ({
  measureNextPaint: vi.fn().mockResolvedValue(10),
}));

describe('滚动 Widget 基准测试', () => {
  let stage: HTMLElement;
  let originalRaf: any;

  beforeEach(() => {
    document.body.innerHTML = '';
    stage = document.createElement('div');
    Object.defineProperty(stage, 'clientWidth', { value: 800 });
    Object.defineProperty(stage, 'clientHeight', { value: 600 });

    mockRuntime.render.mockClear();

    originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => {
      return setTimeout(cb, 0);
    };
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRaf;
  });

  it('应随时间推进滚动位置', async () => {
    const originalDurationFactor = BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR;
    const originalMinDuration = BENCHMARK_CONFIG.SCROLL.MIN_DURATION;

    BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR = 0.01;
    BENCHMARK_CONFIG.SCROLL.MIN_DURATION = 50;

    const count = 20;

    const result = await buildScrollWidgetScene(stage, mockRuntime, count);

    expect(result.scrollMetrics.durationMs).toBeGreaterThan(0);
    expect(result.scrollMetrics.totalFrames).toBeGreaterThan(0);

    expect(mockRuntime.render).toHaveBeenCalled();
    const calls = mockRuntime.render.mock.calls;
    expect(calls.length).toBeGreaterThan(5);

    const firstRender = calls[0][0];
    const lastRender = calls[calls.length - 1][0];

    const getScrollY = (vdom: any) => vdom.props.scrollY;

    expect(getScrollY(firstRender)).toBe(0);
    expect(getScrollY(lastRender)).toBeGreaterThan(0);
    expect(getScrollY(lastRender)).toBeCloseTo(400, -1);

    BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR = originalDurationFactor;
    BENCHMARK_CONFIG.SCROLL.MIN_DURATION = originalMinDuration;
  });
});
