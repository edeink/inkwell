import { measureNextPaint, type Timings } from '../../metrics/collector';
import { BENCHMARK_CONFIG } from '../../utils/config';
import { getThemeColor } from '../../utils/theme';

import type { ScrollMetrics } from '../../index.types';

export async function createScrollDomNodes(
  stage: HTMLElement,
  count: number,
): Promise<{ timings: Timings; scrollMetrics: ScrollMetrics }> {
  const bgBase = getThemeColor('--ink-demo-bg-base');
  const bgEven = getThemeColor('--ink-demo-bg-surface');
  const bgOdd = getThemeColor('--ink-demo-bg-container');
  const textPrimary = getThemeColor('--ink-demo-text-primary');
  const border = getThemeColor('--ink-demo-border');

  const container = document.createElement('div');

  container.style.cssText = `
    width: 100%; 
    height: 100%; 
    overflow-y: auto; 
    overflow-x: hidden;
    background: ${bgBase};
    position: relative;
  `;

  const tBuild0 = performance.now();
  const frag = document.createDocumentFragment();

  const content = document.createElement('div');
  const contentStyle = `
    display: flex; 
    flex-direction: column; 
    width: 100%;
    height: auto;
  `;
  content.style.cssText = contentStyle;

  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    const sizeStyle = `width: 100%; height: ${BENCHMARK_CONFIG.SCROLL.ITEM_HEIGHT}px;`;

    item.style.cssText = `
      ${sizeStyle}
      background-color: ${i % 2 === 0 ? bgEven : bgOdd};
      display: flex;
      align-items: center;
      padding-left: 16px;
      padding-top: 15px;
      box-sizing: border-box; 
      border-bottom: 1px solid ${border};
      font-size: 14px;
      color: ${textPrimary};
      white-space: nowrap;
    `;

    item.style.alignItems = 'flex-start';
    item.style.paddingTop = '15px';

    item.textContent = `List Item ${i}`;
    content.appendChild(item);
  }
  frag.appendChild(content);
  const tBuild1 = performance.now();

  container.appendChild(frag);
  stage.appendChild(container);

  const tLayout0 = performance.now();

  const _ = container.offsetHeight;
  const tLayout1 = performance.now();

  const paintMs = await measureNextPaint();

  const contentSize = count * BENCHMARK_CONFIG.SCROLL.ITEM_HEIGHT;
  const viewportSize = stage.clientHeight || 600;
  const maxScroll = Math.max(0, contentSize - viewportSize);

  const targetDurationMs = Math.max(
    BENCHMARK_CONFIG.SCROLL.MIN_DURATION,
    Math.min(
      BENCHMARK_CONFIG.SCROLL.MAX_DURATION,
      maxScroll * BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR,
    ),
  );

  console.log(
    `[滚动 DOM] 数量: ${count}, 最大滚动: ${maxScroll}, 目标耗时: ${targetDurationMs.toFixed(0)}ms`,
  );

  const startTime = performance.now();
  let frameCount = 0;
  let jankCount = 0;
  let lastTime = startTime;
  let minFps = 60;
  let maxFps = 0;

  let currentScroll = 0;

  if (maxScroll > 0) {
    const loopStart = performance.now();
    lastTime = loopStart;

    while (true) {
      const now = performance.now();
      const elapsed = now - loopStart;
      let isFinished = false;

      if (elapsed >= targetDurationMs) {
        currentScroll = maxScroll;
        isFinished = true;
      } else {
        currentScroll = (elapsed / targetDurationMs) * maxScroll;
      }

      container.scrollTop = currentScroll;

      if (isFinished) {
        break;
      }

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const frameTime = performance.now();
      const delta = frameTime - lastTime;

      if (frameCount > 0) {
        const fps = 1000 / delta;
        minFps = Math.min(minFps, fps);
        maxFps = Math.max(maxFps, fps);
      }

      if (delta > 32) {
        jankCount++;
      }
      lastTime = frameTime;
      frameCount++;
    }
  }

  const endTime = performance.now();
  const durationMs = endTime - startTime;
  const avgFps = frameCount / (durationMs / 1000);

  console.log(
    `[滚动 DOM] 完成。耗时: ${durationMs.toFixed(0)}ms, 平均FPS: ${avgFps.toFixed(1)}, 帧数: ${frameCount}`,
  );

  return {
    timings: {
      createTimeMs: tBuild1 - tBuild0,
      layoutMs: tLayout1 - tLayout0,
      paintMs,
      buildMs: 0,
    },
    scrollMetrics: {
      direction: 'vertical',
      mode: 'one-way',
      durationMs,
      avgFps: isNaN(avgFps) ? 0 : avgFps,
      minFps: frameCount > 5 ? minFps : 0,
      maxFps: frameCount > 5 ? maxFps : 0,
      jankCount,
      totalFrames: frameCount,
      terminationReason: 'completed',
    },
  };
}
