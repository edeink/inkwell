import { describe, expect, it, vi } from 'vitest';

import { Viewport } from '../viewport';

describe('Viewport', () => {
  it('应使用默认值初始化 (should initialize with default values)', () => {
    const viewport = new Viewport({ type: 'Viewport' });
    expect(viewport.scale).toBe(1);
    expect(viewport.tx).toBe(0);
    expect(viewport.ty).toBe(0);
    expect(viewport.scrollX).toBe(0);
    expect(viewport.scrollY).toBe(0);
  });

  it('应使用提供的值初始化 (should initialize with provided values)', () => {
    const viewport = new Viewport({
      type: 'Viewport',
      scale: 2,
      tx: 10,
      ty: 20,
      scrollX: 100,
      scrollY: 200,
    });
    expect(viewport.scale).toBe(2);
    expect(viewport.tx).toBe(10);
    expect(viewport.ty).toBe(20);
    expect(viewport.scrollX).toBe(100);
    expect(viewport.scrollY).toBe(200);
  });

  it('scrollTo 应更新滚动位置并通知监听器 (scrollTo should update scroll position and notify listeners)', () => {
    const onScroll = vi.fn();
    const viewport = new Viewport({ type: 'Viewport', onScroll });

    viewport.scrollTo(50, 60);

    expect(viewport.scrollX).toBe(50);
    expect(viewport.scrollY).toBe(60);
    expect(onScroll).toHaveBeenCalledWith(50, 60);
  });

  it('setTransform 应更新变换并通知监听器 (setTransform should update transform and notify listeners)', () => {
    const onViewChange = vi.fn();
    const viewport = new Viewport({ type: 'Viewport', onViewChange });

    viewport.setTransform(1.5, 30, 40);

    expect(viewport.scale).toBe(1.5);
    expect(viewport.tx).toBe(30);
    expect(viewport.ty).toBe(40);
    expect(onViewChange).toHaveBeenCalledWith(
      expect.objectContaining({
        scale: 1.5,
        tx: 30,
        ty: 40,
      }),
    );
  });

  it('zoomIn 应增加缩放比例 (zoomIn should increase scale)', () => {
    const viewport = new Viewport({ type: 'Viewport', width: 800, height: 600 });
    const initialScale = viewport.scale;

    viewport.zoomIn();

    expect(viewport.scale).toBeGreaterThan(initialScale);
  });

  it('zoomOut 应减小缩放比例 (zoomOut should decrease scale)', () => {
    const viewport = new Viewport({ type: 'Viewport', width: 800, height: 600 });
    const initialScale = viewport.scale;

    viewport.zoomOut();

    expect(viewport.scale).toBeLessThan(initialScale);
  });

  it('clampScale 应限制缩放范围 (clampScale should restrict scale range)', () => {
    const viewport = new Viewport({ type: 'Viewport', minScale: 0.5, maxScale: 2 });

    viewport.setTransform(0.1, 0, 0);
    expect(viewport.scale).toBe(0.5);

    viewport.setTransform(3, 0, 0);
    expect(viewport.scale).toBe(2);
  });
});
