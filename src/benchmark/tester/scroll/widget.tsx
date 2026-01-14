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

export async function buildScrollWidgetScene(
  stageEl: HTMLElement,
  runtime: Runtime,
  count: number,
): Promise<{ timings: Timings; scrollMetrics: ScrollMetrics }> {
  const w = stageEl.clientWidth || 800;
  const h = stageEl.clientHeight || 600;

  // 滚动测试固定为：垂直方向，单向滚动，重复1次（外部 iterationCount 控制）
  // stepSize 将在下面动态计算

  const tBuild0 = performance.now();

  let scrollView: ScrollViewHandle | null = null;

  const content = (
    <Column mainAxisSize={MainAxisSize.Min}>
      {Array.from({ length: count }).map((_, i) => (
        <Column key={`item-${i}`} mainAxisSize={MainAxisSize.Min}>
          <Container
            width={w}
            height={BENCHMARK_CONFIG.SCROLL.ITEM_HEIGHT - 1}
            color={i % 2 === 0 ? '#f0f0f0' : '#ffffff'}
            padding={{ left: 16, top: 15 }}
          >
            <Text text={`List Item ${i}`} style={{ fontSize: 14, color: '#333' }} />
          </Container>
          <Container width={w} height={1} color="#ddd" />
        </Column>
      ))}
    </Column>
  );

  const buildTree = (scrollY: number, withRef: boolean) => (
    <ScrollView
      key="sv"
      ref={
        withRef
          ? (r: unknown) => {
              scrollView = createExposedHandle<ScrollViewHandle>(r);
            }
          : undefined
      }
      width={w}
      height={h}
      scrollY={scrollY}
      scrollX={0}
      scrollBarColor="#999"
      scrollBarWidth={6}
    >
      {content}
    </ScrollView>
  );

  // 构建初始树
  const initialTree = buildTree(0, true);

  const tBuild1 = performance.now();

  runtime.render(initialTree);

  // 这里的 layoutMs 难以精确测量，因为 runtime 是异步调度的
  // 我们记录渲染提交后的第一帧时间
  const paintMs = await measureNextPaint();

  const sv = scrollView as ScrollViewHandle | null;
  const isRealRuntime = runtime instanceof Runtime;

  // 滚动测试参数
  const contentSize = count * BENCHMARK_CONFIG.SCROLL.ITEM_HEIGHT;
  const viewportSize = h;
  const maxScroll = Math.max(0, contentSize - viewportSize);

  // 动态滚动速度调节算法
  const targetDurationMs = Math.max(
    BENCHMARK_CONFIG.SCROLL.MIN_DURATION,
    Math.min(
      BENCHMARK_CONFIG.SCROLL.MAX_DURATION,
      maxScroll * BENCHMARK_CONFIG.SCROLL.DURATION_FACTOR,
    ),
  );

  console.log(
    `[Scroll Widget] Count: ${count}, MaxScroll: ${maxScroll}, ` +
      `TargetDuration: ${targetDurationMs.toFixed(0)}ms`,
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

      if (isRealRuntime && sv) {
        sv.scrollTo(0, currentScroll);
      } else {
        runtime.render(buildTree(currentScroll, false));
      }

      if (isFinished) {
        break;
      }

      // Wait for next frame
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const frameTime = performance.now();
      const delta = frameTime - lastTime;

      if (frameCount > 0) {
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

  console.log(`[Scroll Widget] Finished. Duration: 
    ${durationMs.toFixed(0)}ms, AvgFPS: ${avgFps.toFixed(1)}, Frames: ${frameCount}`);

  return {
    timings: {
      createTimeMs: tBuild1 - tBuild0,
      layoutMs: 0, // Runtime handles layout internally
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
