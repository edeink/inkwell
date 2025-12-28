import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EventManager } from '../manager';

import Runtime from '@/runtime';

describe('焦点管理与文本编辑协同测试', () => {
  let container: HTMLElement;
  let canvas: HTMLCanvasElement;
  let runtime: Runtime;
  let input: HTMLInputElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    canvas = document.createElement('canvas');
    canvas.dataset.inkwellId = 'test-canvas';
    // 确保 canvas 可聚焦
    canvas.tabIndex = 0;
    container.appendChild(canvas);

    input = document.createElement('input');
    document.body.appendChild(input);

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

  it('当输入框处于焦点状态时，点击 Canvas 不应抢占焦点', () => {
    EventManager.bind(runtime);

    // 模拟输入框获得焦点
    input.focus();
    expect(document.activeElement).toBe(input);

    // Mock document.elementsFromPoint
    document.elementsFromPoint = vi.fn().mockReturnValue([canvas]);
    const canvasFocusSpy = vi.spyOn(canvas, 'focus');

    // 触发 Canvas 点击
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 10,
      clientY: 10,
    });
    document.dispatchEvent(event);

    // 验证：Canvas 不应该调用 focus，焦点应保持在 input 上
    expect(canvasFocusSpy).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });

  it('当没有输入框聚焦时，点击 Canvas 应正常获取焦点', () => {
    EventManager.bind(runtime);

    // 确保当前没有输入框聚焦 (聚焦到 body 或其他非 input 元素)
    if (document.activeElement instanceof HTMLInputElement) {
      (document.activeElement as HTMLElement).blur();
    }
    expect(document.activeElement).not.toBe(input);

    // Mock document.elementsFromPoint
    document.elementsFromPoint = vi.fn().mockReturnValue([canvas]);
    const canvasFocusSpy = vi.spyOn(canvas, 'focus');

    // 触发 Canvas 点击
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 10,
      clientY: 10,
    });
    document.dispatchEvent(event);

    // 验证：Canvas 应该尝试获取焦点
    expect(canvasFocusSpy).toHaveBeenCalled();
  });
});
