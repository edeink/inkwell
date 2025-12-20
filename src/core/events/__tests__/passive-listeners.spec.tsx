import { vi, describe, it, expect, afterEach } from 'vitest';

import { EventManager } from '../manager';

import type Runtime from '@/runtime';

describe('EventManager 被动监听器', () => {
  const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

  afterEach(() => {
    addEventListenerSpy.mockClear();
  });

  it('应以 passive: false 注册 touchstart 和 touchmove', () => {
    const canvas = document.createElement('canvas');
    canvas.dataset.inkwellId = 'test-canvas';

    const mockRuntime = {
      getRenderer: () => ({ getRawInstance: () => ({ canvas }) }),
      getContainer: () => document.createElement('div'),
      getCanvasId: () => 'test-canvas',
      getRootWidget: () => null,
    } as unknown as Runtime;

    EventManager.bind(mockRuntime);

    const touchStartCall = addEventListenerSpy.mock.calls.find((call) => call[0] === 'touchstart');
    expect(touchStartCall).toBeDefined();
    expect(touchStartCall?.[2]).toEqual({ passive: false });

    const touchMoveCall = addEventListenerSpy.mock.calls.find((call) => call[0] === 'touchmove');
    expect(touchMoveCall).toBeDefined();
    expect(touchMoveCall?.[2]).toEqual({ passive: false });

    // wheel 事件也应为 passive: false
    const wheelCall = addEventListenerSpy.mock.calls.find((call) => call[0] === 'wheel');
    expect(wheelCall).toBeDefined();
    expect(wheelCall?.[2]).toEqual({ passive: false });

    EventManager.unbind(mockRuntime);
  });
});
