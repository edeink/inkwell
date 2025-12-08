import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventManager } from '@/core/events';
import * as Dispatcher from '@/core/events/dispatcher';

function createStubRuntime(id: string, canvas: HTMLCanvasElement, container: HTMLElement) {
  return {
    getRenderer: () => ({ getRawInstance: () => ({ canvas }) }),
    getContainer: () => container,
    getCanvasId: () => id,
    getRootWidget: () => ({ key: 'root', parent: null }),
  } as any;
}

describe('事件委托（多 canvas 路由）', () => {
  let containerA: HTMLElement;
  let containerB: HTMLElement;
  let canvasA: HTMLCanvasElement;
  let canvasB: HTMLCanvasElement;
  let rtA: any;
  let rtB: any;

  beforeEach(() => {
    containerA = document.createElement('div');
    containerB = document.createElement('div');
    document.body.appendChild(containerA);
    document.body.appendChild(containerB);
    canvasA = document.createElement('canvas');
    canvasB = document.createElement('canvas');
    canvasA.dataset.inkwellId = 'A';
    canvasB.dataset.inkwellId = 'B';
    containerA.appendChild(canvasA);
    containerB.appendChild(canvasB);
    rtA = createStubRuntime('A', canvasA, containerA);
    rtB = createStubRuntime('B', canvasB, containerB);
    EventManager.bind(rtA);
    EventManager.bind(rtB);
  });

  it('点击路由到顶部命中的 canvas', () => {
    const spy = vi.spyOn(Dispatcher, 'dispatchAt').mockImplementation(() => {});
    const orig = document.elementsFromPoint;
    (document as any).elementsFromPoint = vi.fn().mockImplementation(() => [canvasB, canvasA]);
    document.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10 }));
    expect(spy).toHaveBeenCalled();
    const calledWith = spy.mock.calls[0][0];
    expect(calledWith).toBe(rtB);
    spy.mockRestore();
    (document as any).elementsFromPoint = orig;
  });

  it('mousemove 采用 rAF 合并高频事件', async () => {
    const spy = vi.spyOn(Dispatcher, 'dispatchAt').mockImplementation(() => {});
    let stored: FrameRequestCallback | null = null;
    const origRAF = window.requestAnimationFrame;
    const origCAF = window.cancelAnimationFrame;
    (window as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      stored = cb;
      return 1 as any;
    };
    (window as any).cancelAnimationFrame = () => {};
    const orig = document.elementsFromPoint;
    (document as any).elementsFromPoint = vi.fn().mockImplementation(() => [canvasA]);
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 20 }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 21, clientY: 21 }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 22, clientY: 22 }));
    expect(spy).not.toHaveBeenCalled();
    if (stored) {
      stored(performance.now());
    }
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
    (document as any).elementsFromPoint = orig;
    window.requestAnimationFrame = origRAF;
    window.cancelAnimationFrame = origCAF;
  });
});
