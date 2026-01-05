/** @jsxImportSource @/utils/compiler */
import { beforeAll, describe, it, vi } from 'vitest';

import Runtime from '../../../runtime';

import { buildFlexWidgetScene } from './widget';

import { testLogger } from '@/utils/test-logger';

describe('Wrap Performance Benchmark', () => {
  let container: HTMLElement;
  let runtime: Runtime;

  beforeAll(async () => {
    // Mock Canvas
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(0) })),
          putImageData: vi.fn(),
          createImageData: vi.fn(),
          setTransform: vi.fn(),
          drawImage: vi.fn(),
          save: vi.fn(),
          fillText: vi.fn(),
          restore: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          closePath: vi.fn(),
          stroke: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          rotate: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          measureText: vi.fn(() => ({ width: 0 })),
          transform: vi.fn(),
          getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
          rect: vi.fn(),
          clip: vi.fn(),
        }) as any,
    );

    container = document.createElement('div');
    container.id = 'wrap-perf-stage';
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    runtime = await Runtime.create('wrap-perf-stage', { renderer: 'canvas2d' });
  });

  it('measures 1,000 nodes layout performance', async () => {
    const count = 1000;

    // Warmup
    // await buildFlexWidgetScene(container, runtime, 100);

    const timings = await buildFlexWidgetScene(container, runtime, count);

    testLogger.log('--- Wrap 100k Benchmark ---');
    testLogger.log(`Build:  ${timings.buildMs.toFixed(2)} ms`);
    testLogger.log(`Layout: ${timings.layoutMs.toFixed(2)} ms`);
    testLogger.log(`Paint:  ${timings.paintMs.toFixed(2)} ms`);
    testLogger.log(
      `Total:  ${(timings.buildMs + timings.layoutMs + timings.paintMs).toFixed(2)} ms`,
    );
    testLogger.log('---------------------------');
  }, 60000); // Increased timeout for heavy test
});
