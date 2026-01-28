import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlurBoundary } from './index';

import { createTightConstraints } from '@/core/base';

type FakeCtx = {
  setTransform: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  globalAlpha: number;
  filter?: string;
  imageSmoothingEnabled?: boolean;
};

function createMockRenderer() {
  const drawImage = vi.fn();
  const mockRenderer = {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    clipRect: vi.fn(),
    setGlobalAlpha: vi.fn(),
    drawRect: vi.fn(),
    drawText: vi.fn(),
    drawImage,
    render: vi.fn(),
    getResolution: () => 1,
    constructor: class MockLayerRenderer {
      save = vi.fn();
      restore = vi.fn();
      translate = vi.fn();
      scale = vi.fn();
      rotate = vi.fn();
      transform = vi.fn();
      setTransform = vi.fn();
      clipRect = vi.fn();
      setGlobalAlpha = vi.fn();
      drawRect = vi.fn();
      drawText = vi.fn();
      drawImage = vi.fn();
      render = vi.fn();
      setContext = vi.fn();
    },
  };

  return { mockRenderer, drawImage };
}

describe('BlurBoundary', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  let ctxList: FakeCtx[];

  beforeEach(() => {
    ctxList = [];
    HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
      if (contextId !== '2d') {
        return null;
      }
      const ctx: FakeCtx = {
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        drawImage: vi.fn(),
        globalAlpha: 1,
        filter: 'none',
        imageSmoothingEnabled: false,
      };
      ctxList.push(ctx);
      return ctx as unknown as CanvasRenderingContext2D;
    }) as any;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('未触发变化时应复用模糊缓存', () => {
    const { mockRenderer, drawImage } = createMockRenderer();

    const widget = new BlurBoundary({
      type: 'BlurBoundary',
      enabled: true,
      radius: 12,
      throttleMs: 120,
      children: [],
    });
    widget.createElement(widget.data);
    widget.layout(createTightConstraints(200, 100));

    const ctx = { renderer: mockRenderer, enableOffscreenRendering: false } as any;

    widget.paint(ctx);
    expect(ctxList.length).toBeGreaterThanOrEqual(3);
    expect(drawImage).toHaveBeenCalledTimes(1);

    const downsampleDraw = ctxList[1].drawImage;
    const blurDraw = ctxList[2].drawImage;
    expect(downsampleDraw).toHaveBeenCalledTimes(1);
    expect(blurDraw).toHaveBeenCalledTimes(1);

    widget.paint(ctx);
    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(downsampleDraw).toHaveBeenCalledTimes(1);
    expect(blurDraw).toHaveBeenCalledTimes(1);
  });

  it('尺寸变化时应在节流窗口内跳过重算并尾随更新', () => {
    vi.useFakeTimers();

    const now = { value: 0 };
    vi.spyOn(performance, 'now').mockImplementation(() => now.value);

    const { mockRenderer } = createMockRenderer();

    const widget = new BlurBoundary({
      type: 'BlurBoundary',
      enabled: true,
      radius: 12,
      throttleMs: 1000,
      children: [],
    });
    widget.createElement(widget.data);
    widget.layout(createTightConstraints(200, 100));

    const ctx = { renderer: mockRenderer, enableOffscreenRendering: false } as any;

    widget.paint(ctx);
    const totalDraw1 = ctxList.reduce((acc, c) => acc + c.drawImage.mock.calls.length, 0);
    expect(totalDraw1).toBe(2);

    now.value = 100;
    widget.layout(createTightConstraints(240, 120));
    widget.paint(ctx);
    const totalDraw2 = ctxList.reduce((acc, c) => acc + c.drawImage.mock.calls.length, 0);
    expect(totalDraw2).toBe(2);

    vi.advanceTimersByTime(900);

    now.value = 1000;
    widget.paint(ctx);
    const totalDraw3 = ctxList.reduce((acc, c) => acc + c.drawImage.mock.calls.length, 0);
    expect(totalDraw3).toBe(4);
  });
});
