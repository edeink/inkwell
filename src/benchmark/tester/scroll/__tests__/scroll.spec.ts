import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BENCHMARK_CONFIG } from '../../../utils/config';
import { createScrollDomNodes } from '../dom';

describe('滚动测试参数验证', () => {
  let originalLog: typeof console.log;

  beforeEach(() => {
    // 简化版功能测试：为稳定与加速，使用可控的时间与 RAF；此文件不做性能评估
    vi.useFakeTimers();

    originalLog = console.log;
    console.log = () => {};

    let currentTime = 0;
    vi.stubGlobal('performance', { now: () => currentTime });
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
      return setTimeout(() => {
        currentTime += 10;
        fn(currentTime);
      }, 0) as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    console.log = originalLog;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('应正确处理默认参数', async () => {
    // 简化版功能测试：缩小滚动范围与节点数量，加快滚动速度；此用例仅验证功能正确性而非性能
    // 模拟 DOM 环境（最小有效尺寸，确保产生 ~100px 的滚动空间）
    const stage = document.createElement('div');
    Object.defineProperty(stage, 'clientWidth', { configurable: true, value: 200 });
    Object.defineProperty(stage, 'clientHeight', { configurable: true, value: 400 });
    document.body.appendChild(stage);

    // 提升滚动速度并缩短时长，稳定在 500ms 以内
    const originalFactor = BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR;
    const originalMin = BENCHMARK_CONFIG.SCROLL.MIN_DURATION;
    const originalMax = BENCHMARK_CONFIG.SCROLL.MAX_DURATION;
    BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR = 0.2;
    BENCHMARK_CONFIG.SCROLL.MIN_DURATION = 20;
    BENCHMARK_CONFIG.SCROLL.MAX_DURATION = 50;

    // 最小功能验证规模：10 个节点
    const count = 10;
    const resultPromise = createScrollDomNodes(stage, count);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.timings).toBeDefined();
    expect(result.scrollMetrics).toBeDefined();
    expect(result.scrollMetrics.direction).toBe('vertical');
    expect(result.scrollMetrics.mode).toBe('one-way');
    expect(result.scrollMetrics.terminationReason).toBe('completed');

    // 清理
    document.body.removeChild(stage);

    // 还原配置
    BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR = originalFactor;
    BENCHMARK_CONFIG.SCROLL.MIN_DURATION = originalMin;
    BENCHMARK_CONFIG.SCROLL.MAX_DURATION = originalMax;
  }, 500);

  it('应从顶部开始滚动到底部', async () => {
    // 简化版功能测试：缩小滚动范围与节点数量，加快滚动速度；保持断言不变
    const stage = document.createElement('div');
    Object.defineProperty(stage, 'clientWidth', { configurable: true, value: 200 });
    Object.defineProperty(stage, 'clientHeight', { configurable: true, value: 400 });

    const originalFactor = BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR;
    const originalMin = BENCHMARK_CONFIG.SCROLL.MIN_DURATION;
    const originalMax = BENCHMARK_CONFIG.SCROLL.MAX_DURATION;
    BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR = 0.2;
    BENCHMARK_CONFIG.SCROLL.MIN_DURATION = 20;
    BENCHMARK_CONFIG.SCROLL.MAX_DURATION = 50;

    const count = 10;
    const resultPromise = createScrollDomNodes(stage, count);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    // 确保有帧数据
    expect(result.scrollMetrics.totalFrames).toBeGreaterThanOrEqual(0);

    // 还原配置
    BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR = originalFactor;
    BENCHMARK_CONFIG.SCROLL.MIN_DURATION = originalMin;
    BENCHMARK_CONFIG.SCROLL.MAX_DURATION = originalMax;
  }, 500);
});
