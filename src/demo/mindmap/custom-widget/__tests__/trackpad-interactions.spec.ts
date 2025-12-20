import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Viewport } from '../viewport';

import type { InkwellEvent } from '@/core/events';

function createVP() {
  return new Viewport({ type: 'Viewport', key: 'v', scale: 1, tx: 0, ty: 0 } as any);
}

describe('触控板交互', () => {
  let vp: Viewport;
  beforeEach(() => {
    vp = createVP();
  });

  it('单指拖拽 (pointer) 不应平移视口', () => {
    const origTx = vp.tx;
    const origTy = vp.ty;
    vp.onPointerDown({ x: 100, y: 100, nativeEvent: { buttons: 1 } } as unknown as InkwellEvent);
    vp.onPointerMove({ x: 120, y: 120 } as unknown as InkwellEvent);
    expect(vp.tx).toBe(origTx);
    expect(vp.ty).toBe(origTy);
  });

  it('双指滚轮滚动应通过 rAF 实现平滑对角平移', () => {
    const spy = vi.fn();
    vp.createElement({ type: 'Viewport', key: 'v', onScroll: spy } as any);
    const raf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 1 as any;
    };
    vp.onWheel({
      x: 100,
      y: 100,
      nativeEvent: { deltaX: 10, deltaY: 20 },
    } as unknown as InkwellEvent);
    expect(spy).toHaveBeenCalledWith(-10, -20);
    const contentPos = vp.getContentPosition();
    expect(contentPos.tx).toBeCloseTo(-10, 6);
    expect(contentPos.ty).toBeCloseTo(-20, 6);
    globalThis.requestAnimationFrame = raf;
  });

  it('ctrl/meta + 左键点击应进入全选模式并阻止平移', () => {
    vp.onPointerDown({
      x: 0,
      y: 0,
      nativeEvent: { buttons: 1, ctrlKey: true },
    } as unknown as InkwellEvent);
    vp.onPointerMove({ x: 50, y: 50 } as unknown as InkwellEvent);
    expect(vp.tx).toBe(0);
    expect(vp.ty).toBe(0);
    vp.onPointerUp({} as unknown as InkwellEvent);
  });
});
