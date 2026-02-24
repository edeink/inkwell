/**
 * Overlay 高亮去重测试
 *
 * 验证重复渲染时的 RAF 调度去重行为。
 * 注意事项：使用 JSDOM 模拟 DOM 与 RAF。
 * 潜在副作用：会 stub 全局函数与 DOM。
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Overlay from '../components/overlay';

import type { Widget } from '@/core/base';

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as unknown as DOMRect;
}

describe('Overlay 高亮去重', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('命中节点不变且几何不变时不应重复调度渲染', async () => {
    const rafSpy = vi.fn((fn: FrameRequestCallback) => {
      queueMicrotask(() => fn(0));
      return 1 as unknown as number;
    });
    vi.stubGlobal('requestAnimationFrame', rafSpy);
    vi.stubGlobal('cancelAnimationFrame', () => void 0);

    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    document.body.appendChild(container);
    const host = document.createElement('div');
    document.body.appendChild(host);

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 300, 200) as any);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 300, 200) as any);

    const runtime = {
      container,
      getRenderer: () => ({ getRawInstance: () => ({ canvas }) }),
      nextTick: (cb: () => void) => queueMicrotask(cb),
    } as any;

    const widget = {
      type: 'TestWidget',
      key: 'test',
      children: [],
      parent: null,
      renderObject: { size: { width: 100, height: 50 } },
      getAbsolutePosition: () => ({ dx: 10, dy: 20 }),
      getWorldMatrix: () => [1, 0, 0, 1, 0, 0] as [number, number, number, number, number, number],
      getBoundingBox: () => ({ x: 10, y: 20, width: 100, height: 50 }),
    } as unknown as Widget;

    const root = createRoot(host);

    await act(async () => {
      root.render(<Overlay runtime={runtime} active={false} widget={null} />);
      await Promise.resolve();
    });

    await act(async () => {
      root.render(<Overlay runtime={runtime} active={true} widget={widget} />);
      await Promise.resolve();
    });
    rafSpy.mockClear();

    await act(async () => {
      root.render(<Overlay runtime={runtime} active={true} widget={widget} />);
      await Promise.resolve();
    });
    expect(rafSpy).toHaveBeenCalledTimes(0);

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  });
});
