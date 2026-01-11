import { measureNextPaint, type Timings } from '../../metrics/collector';

import type { ScrollMetrics } from '../../index.types';

/**
 * 创建 DOM 滚动列表测试场景
 * @param stage 舞台容器
 * @param count 列表项数量
 */
export async function createScrollDomNodes(
  stage: HTMLElement,
  count: number,
): Promise<{ timings: Timings; scrollMetrics: ScrollMetrics }> {
  const container = document.createElement('div');

  container.style.cssText = `
    width: 100%; 
    height: 100%; 
    overflow-y: auto; 
    overflow-x: hidden;
    background: #fff;
    position: relative;
  `;

  // 预先构建 fragment
  const tBuild0 = performance.now();
  const frag = document.createDocumentFragment();

  // 使用 Flex 布局模拟列表，保持与 Widget 结构一致
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
    // 样式对齐：确保与 Widget 完全一致
    // Widget Container: height 50, padding left 16, border bottom 1px solid #ddd
    const sizeStyle = 'width: 100%; height: 50px;';

    item.style.cssText = `
      ${sizeStyle}
      background-color: ${i % 2 === 0 ? '#f0f0f0' : '#ffffff'};
      display: flex;
      align-items: center;
      padding-left: 16px;
      padding-top: 15px;
      box-sizing: border-box; 
      border-bottom: 1px solid #ddd;
      font-size: 14px;
      color: #333;
      white-space: nowrap;
    `;

    // Adjust alignment to match Widget's likely behavior with padding
    // If Widget uses padding top 15, it might push text down.
    // If we use flex align-items center, we don't need padding top usually.
    // Let's reset padding top and use align-items center for pure centering,
    // OR match the padding if Widget doesn't use center alignment.
    // Previous Widget code: padding={{ left: 16, top: 15 }}.
    // If Container aligns to topLeft (default), then text is at 15px from top.
    // 50px height. 14px text. (50-14)/2 = 18px. 15px is close to center.
    // So Widget is top-aligned with padding.
    // DOM should mimic this.
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

  // 强制回流以触发布局

  const _ = container.offsetHeight;
  const tLayout1 = performance.now();

  const paintMs = await measureNextPaint();

  // Scroll Test Logic
  // 滚动测试参数
  const contentSize = count * 50;
  const viewportSize = stage.clientHeight || 600;
  const maxScroll = Math.max(0, contentSize - viewportSize);

  // 动态滚动速度调节算法
  // 基础滚动时间控制在 200-1000 毫秒 (原 1000-5000)
  // 提高滚动速度以优化测试时间 (5x speed)
  const targetDurationMs = Math.max(200, Math.min(1000, maxScroll * 0.2));

  console.log(
    `[Scroll DOM] Count: ${count}, MaxScroll: ${maxScroll}, TargetDuration: ${targetDurationMs.toFixed(0)}ms`,
  );

  const startTime = performance.now();
  let frameCount = 0;
  let jankCount = 0;
  let lastTime = startTime;
  let minFps = 60;
  let maxFps = 0;

  // 执行一次完整滚动
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

      // Wait for next frame
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const frameTime = performance.now();
      const delta = frameTime - lastTime;

      if (frameCount > 0) {
        // Skip first frame for fps calculation
        const fps = 1000 / delta;
        minFps = Math.min(minFps, fps);
        maxFps = Math.max(maxFps, fps);
      }

      if (delta > 32) {
        // < 30fps
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
    `[Scroll DOM] Finished. Duration: ${durationMs.toFixed(0)}ms, AvgFPS: ${avgFps.toFixed(1)}, Frames: ${frameCount}`,
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
      minFps: frameCount > 5 ? minFps : 0, // Only record if we have enough frames
      maxFps: frameCount > 5 ? maxFps : 0,
      jankCount,
      totalFrames: frameCount,
      terminationReason: 'completed',
    },
  };
}
