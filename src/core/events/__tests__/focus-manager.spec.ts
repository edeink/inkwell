import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EventManager } from '../manager';

import Runtime from '@/runtime';

describe('EventManager 焦点管理测试', () => {
  let container: HTMLElement;
  let canvas: HTMLCanvasElement;
  let runtime: Runtime;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    canvas = document.createElement('canvas');
    canvas.dataset.inkwellId = 'test-canvas';
    container.appendChild(canvas);

    runtime = {
      getRenderer: () => ({
        getRawInstance: () => ({ canvas }),
      }),
      getCanvasId: () => 'test-canvas',
      container,
    } as any;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    EventManager.unbind(runtime);
    vi.useRealTimers();
  });

  it('当鼠标按下时应自动聚焦 Canvas', () => {
    EventManager.bind(runtime);

    // 模拟 document.elementsFromPoint (JSDOM 未实现)
    document.elementsFromPoint = vi.fn().mockReturnValue([canvas]);

    const focusSpy = vi.spyOn(canvas, 'focus');

    const event = new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 10,
      clientY: 10,
    });

    document.dispatchEvent(event);

    expect(focusSpy).toHaveBeenCalled();
  });

  it('如果焦点丢失，应通过 setTimeout 重试聚焦', () => {
    vi.useFakeTimers();
    EventManager.bind(runtime);

    document.elementsFromPoint = vi.fn().mockReturnValue([canvas]);

    const focusSpy = vi.spyOn(canvas, 'focus');

    const event = new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 });
    document.dispatchEvent(event);

    expect(focusSpy).toHaveBeenCalledTimes(1);

    // 手动移开焦点，模拟焦点被"抢占"
    const otherDiv = document.createElement('div');
    otherDiv.tabIndex = 0;
    document.body.appendChild(otherDiv);
    otherDiv.focus();
    expect(document.activeElement).toBe(otherDiv);

    // 运行所有定时器
    vi.runAllTimers();

    // 应该尝试再次聚焦
    expect(focusSpy).toHaveBeenCalledTimes(2);
  });
});
