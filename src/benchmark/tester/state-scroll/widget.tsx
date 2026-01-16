/** @jsxImportSource @/utils/compiler */
import {
  Column,
  Container,
  MainAxisSize,
  ScrollView,
  Text,
  createExposedHandle,
  type ScrollViewHandle,
} from '../../../core';
import Runtime from '../../../runtime';
import { type ScrollMetrics } from '../../index.types';
import { measureNextPaint, type Timings } from '../../metrics/collector';
import { BENCHMARK_CONFIG } from '../../utils/config';
import { getThemeColor } from '../../utils/theme';

export async function buildScrollWidgetScene(
  stageEl: HTMLElement,
  runtime: Runtime,
  count: number,
): Promise<{ timings: Timings; scrollMetrics: ScrollMetrics }> {
  const w = stageEl.clientWidth || 800;
  const h = stageEl.clientHeight || 600;

  const bgEven = getThemeColor('--ink-demo-bg-surface');
  const bgOdd = getThemeColor('--ink-demo-bg-container');
  const textPrimary = getThemeColor('--ink-demo-text-primary');
  const border = getThemeColor('--ink-demo-border');
  const scrollBar = getThemeColor('--ink-demo-text-secondary');

  const tBuild0 = performance.now();

  let scrollView: ScrollViewHandle | null = null;

  const content = (
    <Column mainAxisSize={MainAxisSize.Min}>
      {Array.from({ length: count }).map((_, i) => (
        <Column key={`item-${i}`} mainAxisSize={MainAxisSize.Min}>
          <Container
            width={w}
            height={BENCHMARK_CONFIG.SCROLL.ITEM_HEIGHT - 1}
            color={i % 2 === 0 ? bgEven : bgOdd}
            padding={{ left: 16, top: 15 }}
          >
            <Text text={`List Item ${i}`} style={{ fontSize: 14, color: textPrimary }} />
          </Container>
          <Container width={w} height={1} color={border} />
        </Column>
      ))}
    </Column>
  );

  const buildTree = (scrollY: number, withRef: boolean) => (
    <ScrollView
      key="sv"
      ref={
        withRef
          ? (r: unknown) => (scrollView = createExposedHandle<ScrollViewHandle>(r))
          : undefined
      }
      width={w}
      height={h}
      scrollY={scrollY}
      scrollX={0}
      scrollBarColor={scrollBar}
      scrollBarWidth={6}
    >
      {content}
    </ScrollView>
  );

  const initialTree = buildTree(0, true);

  const tBuild1 = performance.now();

  runtime.render(initialTree);

  const paintMs = await measureNextPaint();

  const sv = scrollView as ScrollViewHandle | null;
  const isRealRuntime = runtime instanceof Runtime;

  const contentSize = count * BENCHMARK_CONFIG.SCROLL.ITEM_HEIGHT;
  const viewportSize = h;
  const maxScroll = Math.max(0, contentSize - viewportSize);

  const targetDurationMs = Math.max(
    BENCHMARK_CONFIG.SCROLL.MIN_DURATION,
    Math.min(
      BENCHMARK_CONFIG.SCROLL.MAX_DURATION,
      maxScroll * BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR,
    ),
  );

  console.log(
    `[滚动 Widget] 数量: ${count}, 最大滚动: ${maxScroll}, 目标耗时: ${targetDurationMs.toFixed(0)}ms`,
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

      if (isRealRuntime && sv) {
        sv.scrollTo(0, currentScroll);
      } else {
        runtime.render(buildTree(currentScroll, false));
      }

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
    `[滚动 Widget] 完成。耗时: ${durationMs.toFixed(0)}ms, 平均FPS: ${avgFps.toFixed(1)}, 帧数: ${frameCount}`,
  );

  return {
    timings: {
      createTimeMs: tBuild1 - tBuild0,
      layoutMs: 0,
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
