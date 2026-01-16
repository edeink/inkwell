/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BENCHMARK_CONFIG } from '../../../utils/config';
import { buildStateWidgetScene } from '../widget';

const mockRuntime = {
  render: vi.fn(),
  getRootWidget: vi.fn(),
  destroy: vi.fn(),
} as any;

vi.mock('../../metrics/collector', () => ({
  measureNextPaint: vi.fn().mockResolvedValue(10),
}));

describe('状态更新（颜色）Widget 基准测试', () => {
  let stage: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    stage = document.createElement('div');
    stage.style.width = '800px';
    stage.style.height = '600px';

    mockRuntime.render.mockClear();
    mockRuntime.getRootWidget.mockClear();
  });

  it('应创建组件并触发指定次数更新', async () => {
    const mockWidget = {
      updateSelection: vi.fn(),
    };
    mockRuntime.getRootWidget.mockReturnValue(mockWidget);

    const originalFrames = BENCHMARK_CONFIG.STATE.FRAMES;
    BENCHMARK_CONFIG.STATE.FRAMES = 5;

    await buildStateWidgetScene(stage, mockRuntime, 100);

    expect(mockRuntime.render).toHaveBeenCalledTimes(1);

    expect(mockWidget.updateSelection).toHaveBeenCalledTimes(5);

    BENCHMARK_CONFIG.STATE.FRAMES = originalFrames;
  });
});
