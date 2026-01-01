/** @jsxImportSource @/utils/compiler */
import { afterAll, beforeAll, describe, it, vi } from 'vitest';

import Runtime from '../../../runtime';

import { createFlexDomNodes } from './dom';
import { buildFlexWidgetScene, updateFlexWidgetScene } from './widget';

describe('Flex Benchmark Runner', () => {
  let container: HTMLElement;
  let runtime: Runtime;

  beforeAll(async () => {
    // Mock HTMLCanvasElement.getContext
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

    // Setup container
    container = document.createElement('div');
    container.id = 'benchmark-stage';
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    // Mock HTMLCanvasElement.getContext if needed (usually JSDOM has basic support, but Canvas2D might need help)
    // But Canvas2DRenderer is used, let's see if it works out of the box with JSDOM + vitest-canvas-mock (if installed)
    // or we might need to mock getContext.
    // Assuming the project setup handles this as seen in other tests.

    // Create runtime
    runtime = await Runtime.create('benchmark-stage', { renderer: 'canvas2d' });
  });

  afterAll(() => {
    runtime.destroy();
    document.body.removeChild(container);
  });

  it('runs benchmarks', async () => {
    const counts = [100, 1000, 5000];

    console.log('--- Flex Benchmark Results ---');
    console.log('Count | Type   | Build (ms) | Layout (ms) | Paint (ms) | Total (ms)');
    console.log('------|--------|------------|-------------|------------|-----------');

    for (const count of counts) {
      // DOM Benchmark
      const domTimings = await createFlexDomNodes(container, count);
      const domTotal = domTimings.buildMs + domTimings.layoutMs + domTimings.paintMs;
      console.log(
        `${count.toString().padEnd(5)} | DOM    | ${domTimings.buildMs.toFixed(2).padEnd(10)} | ${domTimings.layoutMs.toFixed(2).padEnd(11)} | ${domTimings.paintMs.toFixed(2).padEnd(10)} | ${domTotal.toFixed(2)}`,
      );

      // Cleanup DOM
      while (container && container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Widget Benchmark
      // We need to ensure the runtime container is cleared/reset
      // Runtime.create usually attaches to the element.
      // buildFlexWidgetScene uses runtime.container

      const widgetTimings = await buildFlexWidgetScene(container, runtime, count);
      const widgetTotal = widgetTimings.buildMs + widgetTimings.layoutMs + widgetTimings.paintMs;
      console.log(
        `${count.toString().padEnd(5)} | Widget | ${widgetTimings.buildMs.toFixed(2).padEnd(10)} | ${widgetTimings.layoutMs.toFixed(2).padEnd(11)} | ${widgetTimings.paintMs.toFixed(2).padEnd(10)} | ${widgetTotal.toFixed(2)}`,
      );

      // Widget Update Benchmark
      const updateTimings = await updateFlexWidgetScene(container, runtime, count);
      const updateTotal = updateTimings.buildMs + updateTimings.layoutMs + updateTimings.paintMs;
      console.log(
        `${count.toString().padEnd(5)} | Update | ${updateTimings.buildMs.toFixed(2).padEnd(10)} | ${updateTimings.layoutMs.toFixed(2).padEnd(11)} | ${updateTimings.paintMs.toFixed(2).padEnd(10)} | ${updateTotal.toFixed(2)}`,
      );
    }
    console.log('------------------------------');
  });
});
