/** @jsxImportSource @/utils/compiler */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { GlassCardDemoApp } from '../app';
import { GlassCalendarCard } from '../widgets/glass-calendar';
import { FrostedGlassCard, GlassCardComposite } from '../widgets/glass-card';

import type { Widget } from '@/core';

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
      width: 0,
      actualBoundingBoxAscent: 0,
      actualBoundingBoxDescent: 0,
    })),
    filter: 'none',
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textBaseline: 'alphabetic',
    textAlign: 'start',
    roundRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function findFirstWidget(root: Widget | null, predicate: (w: Widget) => boolean): Widget | null {
  if (!root) {
    return null;
  }
  const stack: Widget[] = [root];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (predicate(cur)) {
      return cur;
    }
    const children = cur.children;
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }
  return null;
}

describe('玻璃卡片 Demo：动画更新应隔离兄弟组件 paint', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('FrostedGlassCard 动画 tick 只应触发自身更新，不应触发 GlassCalendarCard.paintSelf', async () => {
    WidgetRegistry.registerType('GlassCardDemoApp', GlassCardDemoApp as any);
    WidgetRegistry.registerType('GlassCardComposite', GlassCardComposite as any);
    WidgetRegistry.registerType('FrostedGlassCard', FrostedGlassCard as any);
    WidgetRegistry.registerType('GlassCalendarCard', GlassCalendarCard as any);

    vi.useFakeTimers();
    let time = 0;
    let rafId = 1;
    const rafCallbacks = new Map<number, (t: number) => void>();
    vi.stubGlobal('requestAnimationFrame', ((cb: (t: number) => void) => {
      const id = rafId++;
      rafCallbacks.set(id, cb);
      setTimeout(() => {
        const fn = rafCallbacks.get(id);
        if (!fn) {
          return;
        }
        rafCallbacks.delete(id);
        time += 16;
        fn(time);
      }, 16);
      return id;
    }) as any);
    vi.stubGlobal('cancelAnimationFrame', ((id: number) => {
      rafCallbacks.delete(id);
    }) as any);

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() =>
      createMock2dContext(),
    );

    const container = document.createElement('div');
    container.id = 'glass-card-demo-repaint-isolation';
    document.body.appendChild(container);
    Object.defineProperty(container, 'clientWidth', { value: 980, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 800, configurable: true });

    const runtime = await Runtime.create(container.id, {
      enableOffscreenRendering: true,
      resolution: 1,
    });
    try {
      let fullClearCount = 0;
      let partialClearCount = 0;
      const origClearCanvas = (runtime as any).clearCanvas.bind(runtime);
      (runtime as any).clearCanvas = (rect?: any) => {
        if (rect) {
          partialClearCount++;
        } else {
          fullClearCount++;
        }
        return origClearCanvas(rect);
      };

      await runtime.render(<GlassCardDemoApp width={980} height={800} theme={Themes.light} />);

      fullClearCount = 0;
      partialClearCount = 0;

      const canvas = runtime.canvas;
      expect(canvas).toBeTruthy();
      if (canvas) {
        const renderer = runtime.getRenderer() as any;
        const rawResolution = renderer?.getResolution?.() ?? 1;
        const resolution =
          typeof rawResolution === 'number' && Number.isFinite(rawResolution) && rawResolution > 0
            ? rawResolution
            : 1;
        canvas.width = Math.round(980 * resolution);
        canvas.height = Math.round(800 * resolution);
        canvas.style.width = '980px';
        canvas.style.height = '800px';
      }

      const root = runtime.getRootWidget();
      const calendar = findFirstWidget(
        root,
        (w) => w instanceof GlassCalendarCard,
      ) as GlassCalendarCard | null;
      const frosted = findFirstWidget(
        root,
        (w) => w instanceof FrostedGlassCard && (w as any).animate === true,
      ) as FrostedGlassCard | null;

      expect(calendar).toBeTruthy();
      expect(frosted).toBeTruthy();

      let calendarPaintSelfCount = 0;
      let frostedPaintSelfCount = 0;

      const origCalendarPaintSelf = (calendar as any).paintSelf.bind(calendar);
      (calendar as any).paintSelf = (ctx: any) => {
        calendarPaintSelfCount++;
        return origCalendarPaintSelf(ctx);
      };

      const origFrostedPaintSelf = (frosted as any).paintSelf.bind(frosted);
      (frosted as any).paintSelf = (ctx: any) => {
        frostedPaintSelfCount++;
        return origFrostedPaintSelf(ctx);
      };

      expect((calendar as any)._needsPaint).toBe(false);
      expect((frosted as any).animate).toBe(true);

      await vi.advanceTimersByTimeAsync(320);
      await runtime.rebuild();

      expect(frostedPaintSelfCount).toBeGreaterThan(5);
      expect(calendarPaintSelfCount).toBeLessThanOrEqual(1);
      expect(fullClearCount).toBeLessThanOrEqual(1);
      expect(partialClearCount).toBeGreaterThanOrEqual(1);
    } finally {
      runtime.destroy();
      container.remove();
    }
  });
});
