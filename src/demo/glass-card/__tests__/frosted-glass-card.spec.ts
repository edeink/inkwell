import { afterEach, describe, expect, it, vi } from 'vitest';

import { FrostedGlassCard } from '../widgets/frosted-glass-card';

import { createBoxConstraints } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { Themes } from '@/styles/theme';

function createMock2dContext() {
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
    createLinearGradient: vi.fn(() => gradient),
    fillText: vi.fn(),
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
    roundRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('FrostedGlassCard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('应绘制：底图 + 磨砂层 + 清晰窗口覆盖', () => {
    WidgetRegistry.registerType('FrostedGlassCard', FrostedGlassCard as any);

    const ctx = createMock2dContext();
    const renderer = {
      getResolution: () => 1,
      getRawInstance: () => ctx,
      drawRect: vi.fn(),
    } as any;

    const w = new FrostedGlassCard({
      type: 'FrostedGlassCard',
      width: 420,
      height: 240,
      theme: Themes.light,
      blurPx: 12,
      glassAlpha: 0.18,
      windowRatio: 0.33,
      animate: false,
    });
    w.createElement(w.data as any);
    w.layout(createBoxConstraints({ maxWidth: 800, maxHeight: 600 }));
    (w as any).paintSelf({ renderer } as any);

    expect(ctx.drawImage).toHaveBeenCalled();
    expect((ctx.drawImage as any).mock.calls.length).toBe(3);
  });

  it('应复用离屏底图缓存，避免重复分配', () => {
    WidgetRegistry.registerType('FrostedGlassCard', FrostedGlassCard as any);

    const ctx = createMock2dContext();
    const renderer = {
      getResolution: () => 1,
      getRawInstance: () => ctx,
      drawRect: vi.fn(),
    } as any;

    const createEl = vi.spyOn(document, 'createElement');

    const w = new FrostedGlassCard({
      type: 'FrostedGlassCard',
      width: 420,
      height: 240,
      theme: Themes.light,
      blurPx: 12,
      animate: false,
    });
    w.createElement(w.data as any);
    w.layout(createBoxConstraints({ maxWidth: 800, maxHeight: 600 }));
    (w as any).paintSelf({ renderer } as any);
    (w as any).paintSelf({ renderer } as any);

    const canvasCreates = createEl.mock.calls.filter((c) => c[0] === 'canvas').length;
    expect(canvasCreates).toBe(1);
  });

  it('windowRatio 改变时应刷新底图缓存 key，但复用 canvas', () => {
    WidgetRegistry.registerType('FrostedGlassCard', FrostedGlassCard as any);

    const ctx = createMock2dContext();
    const renderer = {
      getResolution: () => 1,
      getRawInstance: () => ctx,
      drawRect: vi.fn(),
    } as any;

    const w = new FrostedGlassCard({
      type: 'FrostedGlassCard',
      width: 420,
      height: 240,
      theme: Themes.light,
      windowRatio: 0.28,
      animate: false,
    });
    w.createElement(w.data as any);
    w.layout(createBoxConstraints({ maxWidth: 800, maxHeight: 600 }));
    (w as any).paintSelf({ renderer } as any);

    const layer1 = (w as any).baseLayer;
    expect(layer1).toBeTruthy();
    const key1 = layer1.key as string;
    const canvas1 = layer1.canvas;

    (w as any).windowRatio = 0.44;
    (w as any).paintSelf({ renderer } as any);

    const layer2 = (w as any).baseLayer;
    expect(layer2).toBeTruthy();
    expect(layer2.canvas).toBe(canvas1);
    expect(layer2.key).not.toBe(key1);
  });

  it('dispose 时应取消动画帧，避免泄漏', () => {
    WidgetRegistry.registerType('FrostedGlassCard', FrostedGlassCard as any);

    const ctx = createMock2dContext();
    const renderer = {
      getResolution: () => 1,
      getRawInstance: () => ctx,
      drawRect: vi.fn(),
    } as any;

    const raf = vi.fn(() => 123 as any);
    const caf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);

    const w = new FrostedGlassCard({
      type: 'FrostedGlassCard',
      width: 420,
      height: 240,
      theme: Themes.light,
      animate: true,
    });
    w.createElement(w.data as any);
    w.layout(createBoxConstraints({ maxWidth: 800, maxHeight: 600 }));
    (w as any).paintSelf({ renderer } as any);
    w.dispose();

    expect(raf).toHaveBeenCalled();
    expect(caf).toHaveBeenCalledWith(123);
  });

  it('重复绘制不应重复启动动画帧循环', () => {
    WidgetRegistry.registerType('FrostedGlassCard', FrostedGlassCard as any);

    const ctx = createMock2dContext();
    const renderer = {
      getResolution: () => 1,
      getRawInstance: () => ctx,
      drawRect: vi.fn(),
    } as any;

    const raf = vi.fn(() => 456 as any);
    vi.stubGlobal('requestAnimationFrame', raf);

    const w = new FrostedGlassCard({
      type: 'FrostedGlassCard',
      width: 420,
      height: 240,
      theme: Themes.light,
      animate: true,
    });
    w.createElement(w.data as any);
    w.layout(createBoxConstraints({ maxWidth: 800, maxHeight: 600 }));

    (w as any).paintSelf({ renderer } as any);
    (w as any).paintSelf({ renderer } as any);

    expect(raf).toHaveBeenCalledTimes(1);
  });
});
