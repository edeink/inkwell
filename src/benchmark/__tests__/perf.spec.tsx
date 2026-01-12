/** @jsxImportSource @/utils/compiler */
import { afterAll, beforeAll, describe, it, vi } from 'vitest';

import { Container, Positioned, SizedBox, Stack, Wrap } from '../../core';
import Runtime from '../../runtime';

// Mock Canvas environment
function setupCanvasMock() {
  const mockContext = {
    canvas: { width: 800, height: 600, style: {} },
    scale: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({
      width: 10,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 2,
    })),
    fillText: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    clip: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    drawImage: vi.fn(),
  };

  // @ts-ignore
  HTMLCanvasElement.prototype.getContext = function (type: string) {
    if (type === '2d') {
      const ctx = new Proxy(mockContext, {
        get: (target, prop) => {
          if (prop === 'canvas') {
            return this;
          }
          if (prop in target) {
            return target[prop as keyof typeof target];
          }
          return vi.fn();
        },
        set() {
          return true;
        },
      });
      return ctx;
    }
    return null;
  };

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

  it('State Widget Benchmark Loop', async () => {
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

    // Initial render
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

    console.log(`State Benchmark Loop: ${duration.toFixed(2)}ms for ${frames} frames`);
    console.log(`Average Frame Time: ${(duration / frames).toFixed(2)}ms`);
    console.log(`FPS: ${fps.toFixed(2)}`);

    runtime.destroy();
  }, 20000);

  it('Pipeline Widget Benchmark Loop', async () => {
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

    // Initial render
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

    console.log(`Pipeline Benchmark Loop: ${duration.toFixed(2)}ms for ${frames} frames`);
    console.log(`Average Frame Time: ${(duration / frames).toFixed(2)}ms`);
    console.log(`FPS: ${fps.toFixed(2)}`);

    runtime.destroy();
  }, 20000);
});
