/** @jsxImportSource @/utils/compiler */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Container, Positioned, SizedBox, Stack, Wrap } from '../../core';
import {
  GlassChartProgressRing,
  GlassChartSlot,
} from '../../demo/glass-card/widgets/glass-chart/glass-chart-effect';
import Runtime from '../../runtime';
import { Themes } from '../../styles/theme';

function setupCanvasMock(): void {
  const createMock2dContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
    const gradient = { addColorStop: () => {} };
    const ctx: any = {
      canvas,
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arcTo: () => {},
      arc: () => {},
      rect: () => {},
      clip: () => {},
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fill: () => {},
      stroke: () => {},
      setTransform: () => {},
      resetTransform: () => {},
      scale: () => {},
      translate: () => {},
      rotate: () => {},
      transform: () => {},
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      drawImage: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: () => ({
        width: 10,
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 2,
      }),
      filter: 'none',
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      font: '',
      textBaseline: 'alphabetic',
      textAlign: 'start',
    };
    return new Proxy(ctx, {
      get: (target, prop) => {
        if (prop === 'canvas') {
          return canvas as any;
        }
        const v = (target as any)[prop];
        if (v !== undefined) {
          return v;
        }
        return () => {};
      },
      set: (target, prop, value) => {
        (target as any)[prop] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
  };

  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
    if (type !== '2d') {
      return null;
    }
    return createMock2dContext(this);
  } as any;

  if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = (cb) => window.setTimeout(() => cb(performance.now()), 16);
  }
}

describe('Benchmark Performance', () => {
  let stage: HTMLElement;
  let runtime: Runtime;

  beforeAll(() => {
    setupCanvasMock();
    document.body.innerHTML = '';
    stage = document.createElement('div');
    stage.id = 'benchmark-stage';
    stage.style.width = '800px';
    stage.style.height = '600px';
    document.body.appendChild(stage);
  });

  afterAll(() => {
    if (runtime) {
      runtime.destroy();
    }
  });

  it('状态组件基准循环', async () => {
    runtime = await Runtime.create('benchmark-stage');
    const count = 1000;
    const w = 800;
    const h = 600;
    const effW = Math.max(w, 300);
    const effH = Math.max(h, 200);
    const GAP = 2;
    let side = Math.floor(Math.sqrt((effW * effH) / count)) - GAP;
    if (side < 4) {
      side = 4;
    }

    const renderTree = (selectedIndices: Set<number>) => (
      <Container width={w} height={h} color="#fff">
        <Wrap spacing={GAP} runSpacing={GAP}>
          {Array.from({ length: count }).map((_, i) => (
            <Container
              key={String(i)}
              width={side}
              height={side}
              color={selectedIndices.has(i) ? 'red' : '#ccc'}
            />
          ))}
        </Wrap>
      </Container>
    );

    await runtime.render(renderTree(new Set()));

    const frames = 100;
    const BATCH_SIZE = 20;
    const start = performance.now();

    for (let f = 0; f < frames; f++) {
      const nextIndices = new Set<number>();
      for (let k = 0; k < BATCH_SIZE; k++) {
        nextIndices.add(Math.floor(Math.random() * count));
      }
      await runtime.render(renderTree(nextIndices));
    }
    const end = performance.now();
    const duration = end - start;
    const fps = (frames / duration) * 1000;

    console.log(`状态组件基准循环：${duration.toFixed(2)}ms / ${frames} 帧`);
    console.log(`平均帧耗时：${(duration / frames).toFixed(2)}ms`);
    console.log(`FPS：${fps.toFixed(2)}`);

    runtime.destroy();
  }, 20000);

  it('管线组件基准循环', async () => {
    runtime = await Runtime.create('benchmark-stage');
    const count = 1000;
    const w = 800;
    const h = 600;

    const renderFrame = (time: number) => (
      <SizedBox width={w} height={h}>
        <Stack>
          {Array.from({ length: count }).map((_, i) => {
            const x = (Math.sin(time + i * 0.05) * 0.4 + 0.5) * (w - 10);
            const y = (Math.cos(time + i * 0.07) * 0.4 + 0.5) * (h - 10);
            return (
              <Positioned key={`p-${i}`} left={x} top={y}>
                <Container
                  key={`c-${i}`}
                  width={6}
                  height={6}
                  color={i % 2 ? '#ff0055' : '#00ccff'}
                  borderRadius={3}
                />
              </Positioned>
            );
          })}
        </Stack>
      </SizedBox>
    );

    await runtime.render(renderFrame(0));

    const frames = 60;
    const start = performance.now();

    for (let f = 0; f < frames; f++) {
      const time = (performance.now() - start) / 1000;
      await runtime.render(renderFrame(time));
    }
    const end = performance.now();
    const duration = end - start;
    const fps = (frames / duration) * 1000;

    console.log(`管线组件基准循环：${duration.toFixed(2)}ms / ${frames} 帧`);
    console.log(`平均帧耗时：${(duration / frames).toFixed(2)}ms`);
    console.log(`FPS：${fps.toFixed(2)}`);

    runtime.destroy();
  }, 20000);

  it('玻璃图表 60fps 基准循环', async () => {
    runtime = await Runtime.create('benchmark-stage');
    const w = 360;
    const h = 460;
    const frames = 900;
    const warmup = 6;
    const theme = Themes.dark;

    const renderFrame = (p: number) => (
      <SizedBox width={w} height={h}>
        <Stack>
          <Positioned left={0} top={0} right={0} bottom={0}>
            <GlassChartSlot theme={theme} />
          </Positioned>
          <Positioned left={0} top={0} right={0} bottom={0}>
            <GlassChartProgressRing theme={theme} progress={p} />
          </Positioned>
        </Stack>
      </SizedBox>
    );

    const runOnce = async (disableCache: boolean) => {
      (globalThis as any).__INKWELL_DISABLE_APPLY_ALPHA_CACHE__ = disableCache;
      await runtime.render(renderFrame(0.36));
      for (let i = 0; i < warmup; i++) {
        await runtime.render(renderFrame((i % 100) / 100));
      }

      const heapBefore = typeof process !== 'undefined' ? process.memoryUsage().heapUsed : 0;
      const start = performance.now();
      for (let f = 0; f < frames; f++) {
        await runtime.render(renderFrame((f % 100) / 100));
      }
      const end = performance.now();
      const heapAfter = typeof process !== 'undefined' ? process.memoryUsage().heapUsed : 0;

      const duration = end - start;
      const avg = duration / frames;
      const fps = (frames / duration) * 1000;
      const heapDelta = heapBefore && heapAfter ? Math.max(0, heapAfter - heapBefore) : 0;

      return { duration, avg, fps, heapDelta };
    };

    const median = (values: number[]) => {
      const s = [...values].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)] ?? 0;
    };

    const runSample = async (disableCache: boolean) => {
      const samples: Array<Awaited<ReturnType<typeof runOnce>>> = [];
      for (let i = 0; i < 3; i++) {
        samples.push(await runOnce(disableCache));
      }
      const avgMed = median(samples.map((x) => x.avg));
      const fpsMed = median(samples.map((x) => x.fps));
      const durationMed = median(samples.map((x) => x.duration));
      const heapDeltaMed = median(samples.map((x) => x.heapDelta));
      return { duration: durationMed, avg: avgMed, fps: fpsMed, heapDelta: heapDeltaMed };
    };

    const baseline = await runSample(true);
    const optimized = await runSample(false);
    const improvement = (baseline.avg - optimized.avg) / baseline.avg;

    console.log(`玻璃图表基准循环（关闭缓存）：${baseline.duration.toFixed(2)}ms / ${frames} 帧`);
    console.log(`平均帧耗时：${baseline.avg.toFixed(2)}ms，FPS：${baseline.fps.toFixed(2)}`);
    console.log(`玻璃图表基准循环（开启缓存）：${optimized.duration.toFixed(2)}ms / ${frames} 帧`);
    console.log(`平均帧耗时：${optimized.avg.toFixed(2)}ms，FPS：${optimized.fps.toFixed(2)}`);
    console.log(`平均帧耗时下降：${(improvement * 100).toFixed(2)}%`);

    expect(Number.isFinite(baseline.avg)).toBe(true);
    expect(Number.isFinite(optimized.avg)).toBe(true);
    expect(optimized.avg).toBeLessThanOrEqual(baseline.avg * 0.85);
    expect(optimized.heapDelta).toBeLessThanOrEqual(baseline.heapDelta + 3 * 1024 * 1024);
    runtime.destroy();
  }, 20000);
});
