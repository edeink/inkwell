import { vi, describe, it, expect, afterEach } from 'vitest';

import { EventManager } from '../manager';

import type Runtime from '@/runtime';

describe('EventManager Passive Listeners', () => {
  const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

  afterEach(() => {
    addEventListenerSpy.mockClear();
  });

  it('should register touchstart and touchmove with passive: false', () => {
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

    // Wheel should also be passive: false
    const wheelCall = addEventListenerSpy.mock.calls.find((call) => call[0] === 'wheel');
    expect(wheelCall).toBeDefined();
    expect(wheelCall?.[2]).toEqual({ passive: false });

    EventManager.unbind(mockRuntime);
  });
});
