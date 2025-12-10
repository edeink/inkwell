import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Viewport } from '../viewport';

function createVP() {
  return new Viewport({ type: 'Viewport', key: 'v', scale: 1, tx: 0, ty: 0 } as any);
}

describe('Trackpad interactions', () => {
  let vp: Viewport;
  beforeEach(() => {
    vp = createVP();
  });

  it('single-finger drag (pointer) does not pan viewport', () => {
    const origTx = vp.tx;
    const origTy = vp.ty;
    vp.onPointerDown({ x: 100, y: 100, nativeEvent: { buttons: 1 } });
    vp.onPointerMove({ x: 120, y: 120 });
    expect(vp.tx).toBe(origTx);
    expect(vp.ty).toBe(origTy);
  });

  it('two-finger wheel scroll pans diagonally and smooth via rAF', () => {
    const spy = vi.fn();
    vp.createElement({ type: 'Viewport', key: 'v', onSetViewPosition: spy } as any);
    const raf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 1 as any;
    };
    vp.onWheel({ nativeEvent: { deltaX: 10, deltaY: 20 } });
    expect(spy).toHaveBeenCalledWith(-10, -20);
    expect(vp.tx).toBe(-10);
    expect(vp.ty).toBe(-20);
    globalThis.requestAnimationFrame = raf;
  });

  it('ctrl/meta + left mouse enters select-all and prevents pan', () => {
    vp.onPointerDown({ x: 0, y: 0, nativeEvent: { buttons: 1, ctrlKey: true } });
    vp.onPointerMove({ x: 50, y: 50 });
    expect(vp.tx).toBe(0);
    expect(vp.ty).toBe(0);
    vp.onPointerUp({});
  });
});
