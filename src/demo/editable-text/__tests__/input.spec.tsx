/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Input } from '../widget/Input';

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

describe('Input Component', () => {
  let inputComponent: Input;
  let props: any;

  beforeEach(() => {
    const mockContext = {
      font: '',
      measureText: vi.fn().mockImplementation((text: string) => ({ width: text.length * 10 })),
    };
    // @ts-ignore
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
});
