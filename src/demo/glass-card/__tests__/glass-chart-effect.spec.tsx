/** @jsxImportSource @/utils/compiler */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { GlassChartProgressRing } from '../widgets/glass-chart/glass-chart-effect';

import type { Widget } from '@/core';

import { Positioned, SizedBox, Stack } from '@/core';
import { WidgetRegistry } from '@/core/registry';
import Runtime from '@/runtime';
import { Themes } from '@/styles/theme';

function createMock2dContext(): CanvasRenderingContext2D {
  const addColorStop = vi.fn();
  const gradient = { addColorStop };
  return {
    canvas: document.createElement('canvas'),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    transform: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    drawImage: vi.fn(),
    measureText: vi.fn(() => ({
      width: 10,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 2,
    })),
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
  } as unknown as CanvasRenderingContext2D;
}

function approxEq(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

describe('GlassChart：进度环绘制回归', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('progress=0 时不应触发 drawImage 合成', async () => {
    WidgetRegistry.registerType('GlassChartProgressRing', GlassChartProgressRing as any);
    const ctx = createMock2dContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx);

    const container = document.createElement('div');
    container.id = 'glass-chart-canvas-progress-0';
    document.body.appendChild(container);
    Object.defineProperty(container, 'clientWidth', { value: 360, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 460, configurable: true });

    const runtime = await Runtime.create(container.id, {
      enableOffscreenRendering: true,
      resolution: 1,
    });
    try {
      const tree = (
        <SizedBox width={360} height={460}>
          <Stack>
            <Positioned left={0} top={0} right={0} bottom={0}>
              <GlassChartProgressRing theme={Themes.dark} progress={0} />
            </Positioned>
          </Stack>
        </SizedBox>
      );
      await runtime.render(tree as unknown as Widget);

      expect((ctx.drawImage as any).mock.calls.length).toBe(0);
    } finally {
      runtime.destroy();
      container.remove();
    }
  });

  it('progress>0 时应绘制进度弧并触发一次合成 drawImage', async () => {
    WidgetRegistry.registerType('GlassChartProgressRing', GlassChartProgressRing as any);
    const ctx = createMock2dContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx);

    const container = document.createElement('div');
    container.id = 'glass-chart-canvas-progress-half';
    document.body.appendChild(container);
    Object.defineProperty(container, 'clientWidth', { value: 360, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 460, configurable: true });

    const runtime = await Runtime.create(container.id, {
      enableOffscreenRendering: true,
      resolution: 1,
    });
    try {
      const tree = (
        <SizedBox width={360} height={460}>
          <Stack>
            <Positioned left={0} top={0} right={0} bottom={0}>
              <GlassChartProgressRing theme={Themes.dark} progress={0.5} />
            </Positioned>
          </Stack>
        </SizedBox>
      );
      await runtime.render(tree as unknown as Widget);

      expect((ctx.drawImage as any).mock.calls.length).toBe(1);

      const arcCalls = (ctx.arc as any).mock.calls as Array<
        [number, number, number, number, number, ...any[]]
      >;
      const startA = -Math.PI / 2;
      const endA = startA + Math.PI;
      const hasProgressArc = arcCalls.some(
        (args) => approxEq(args[3], startA) && approxEq(args[4], endA),
      );
      expect(hasProgressArc).toBe(true);
    } finally {
      runtime.destroy();
      container.remove();
    }
  });
});
