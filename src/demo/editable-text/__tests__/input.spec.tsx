/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Input } from '../widget/input';

import { getCurrentThemeMode, Themes } from '@/styles/theme';

vi.mock('@/core', async () => {
  return {
    Container: (props: any) => ({ type: 'Container', props }),
    Stack: (props: any) => ({ type: 'Stack', props }),
    Text: (props: any) => ({ type: 'Text', props }),
    ScrollView: (props: any) => ({ type: 'ScrollView', props }),
    StatefulWidget: (await import('@/core/state/stateful')).StatefulWidget,
    Widget: (await import('@/core/base')).Widget,
  };
});

vi.mock('@/core/positioned', () => ({
  Positioned: (props: any) => ({ type: 'Positioned', props }),
}));

function findFirstContainerColor(
  node: any,
  predicate: (props: any) => boolean,
): string | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  const typeName = typeof node.type === 'string' ? node.type : node.type?.name;
  if (typeName === 'Container' && node.props && predicate(node.props)) {
    return node.props.color;
  }
  const children = node.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findFirstContainerColor(child, predicate);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  return findFirstContainerColor(children, predicate);
}

describe('Input 组件', () => {
  let inputComponent: Input;
  let props: any;

  beforeEach(() => {
    const mockContext = {
      font: '',
      measureText: vi.fn().mockImplementation((text: string) => ({ width: text.length * 10 })),
    };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);

    document.body.innerHTML = '';

    props = {
      type: 'Input',
      value: 'Hello',
      onChange: vi.fn(),
    };

    inputComponent = new Input(props);
  });

  afterEach(() => {
    inputComponent.dispose();
  });

  it('拖拽选区时应阻止事件冒泡并更新选区', () => {
    const element = inputComponent.render() as any;
    const typeName = typeof element.type === 'string' ? element.type : element.type?.name;
    expect(typeName).toBe('Container');

    const stopPropagation = vi.fn();

    element.props.onPointerDown({ x: 0, y: 0, stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalled();

    stopPropagation.mockClear();
    element.props.onPointerMove({ x: 30, y: 0, stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalled();

    stopPropagation.mockClear();
    element.props.onPointerUp({ x: 30, y: 0, stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalled();

    // @ts-expect-error 测试用访问内部状态
    expect(inputComponent.state.selectionEnd).toBeGreaterThanOrEqual(0);
  });

  it('拖拽时应使用全局监听继续更新选区', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const element = inputComponent.render() as any;
    element.props.onPointerDown({ x: 0, y: 0, target: {}, stopPropagation: vi.fn() } as any);

    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));

    const MoveEvent = (window as any).PointerEvent ?? MouseEvent;
    window.dispatchEvent(new MoveEvent('pointermove', { clientX: 30, clientY: 0 }) as any);

    // @ts-expect-error 测试用访问内部状态
    expect(inputComponent.state.selectionEnd).toBeGreaterThan(0);

    window.dispatchEvent(new MoveEvent('pointerup', { clientX: 30, clientY: 0 }) as any);
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });

  it('聚焦与失焦时选区颜色应不同', () => {
    const element = inputComponent.render() as any;
    element.props.onPointerDown({ x: 0, y: 0, target: {}, stopPropagation: vi.fn() } as any);
    element.props.onPointerMove({ x: 30, y: 0, stopPropagation: vi.fn() } as any);
    element.props.onPointerUp({ x: 30, y: 0, stopPropagation: vi.fn() } as any);

    const theme = Themes[getCurrentThemeMode()];

    const inputEl = document.querySelector('input');
    expect(inputEl).not.toBeNull();

    const focusedTree = inputComponent.render() as any;
    const focusedColor = findFirstContainerColor(
      focusedTree,
      (p) => typeof p.color === 'string' && p.width !== 2,
    );
    expect(focusedColor).toBe(theme.state.focus);

    inputEl?.dispatchEvent(new Event('blur'));
    const blurredTree2 = inputComponent.render() as any;
    const blurredColor2 = findFirstContainerColor(
      blurredTree2,
      (p) => typeof p.color === 'string' && p.width !== 2,
    );
    expect(blurredColor2).toBe(theme.state.selected);
  });
});
