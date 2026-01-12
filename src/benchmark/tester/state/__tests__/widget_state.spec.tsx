/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BENCHMARK_CONFIG } from '../../../utils/config';
import { buildStateWidgetScene } from '../widget';

// Mock Runtime
const mockRuntime = {
  render: vi.fn(),
  getRootWidget: vi.fn(),
  destroy: vi.fn(),
} as any;

// Mock measureNextPaint
vi.mock('../../metrics/collector', () => ({
  measureNextPaint: vi.fn().mockResolvedValue(10),
}));

describe('State Widget Benchmark', () => {
  let stage: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    stage = document.createElement('div');
    stage.style.width = '800px';
    stage.style.height = '600px';

    mockRuntime.render.mockClear();
    mockRuntime.getRootWidget.mockClear();
  });

  it('should create StateBenchmarkWidget and update it', async () => {
    // Mock getRootWidget to return an object with updateSelection
    const mockWidget = {
      updateSelection: vi.fn(),
    };
    mockRuntime.getRootWidget.mockReturnValue(mockWidget);

    // Run benchmark with small frame count for speed
    const originalFrames = BENCHMARK_CONFIG.STATE.FRAMES;
    BENCHMARK_CONFIG.STATE.FRAMES = 5; // Reduced frames

    await buildStateWidgetScene(stage, mockRuntime, 100);

    // Verify initial render
    expect(mockRuntime.render).toHaveBeenCalledTimes(1);

    // Verify updates
    expect(mockWidget.updateSelection).toHaveBeenCalledTimes(5);

    // Restore config
    BENCHMARK_CONFIG.STATE.FRAMES = originalFrames;
  });
});
