/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TextArea } from '../widget/TextArea';

import { compileElement } from '@/utils/compiler/jsx-compiler';

// Mock core components
vi.mock('@/core', async () => {
  return {
    Container: (props: any) => ({ type: 'Container', props }),
    Stack: (props: any) => ({ type: 'Stack', props }),
    Text: (props: any) => ({ type: 'Text', props }),
    Padding: (props: any) => ({ type: 'Padding', props }),
    ScrollView: (props: any) => ({ type: 'ScrollView', props }),
    StatefulWidget: (await import('@/core/state/stateful')).StatefulWidget,
    Widget: (await import('@/core/base')).Widget,
  };
});

vi.mock('@/core/positioned', () => ({
  Positioned: (props: any) => ({ type: 'Positioned', props }),
}));

// Mock TextLayout
vi.mock('@/core/text/layout', () => ({
  TextLayout: {
    layout: vi.fn().mockReturnValue({
      width: 100,
      height: 40,
      lines: [
        { text: 'Line 1', width: 50, startIndex: 0, endIndex: 6, height: 20, x: 0, y: 0 },
        { text: 'Line 2', width: 50, startIndex: 7, endIndex: 13, height: 20, x: 0, y: 20 },
      ],
      lineHeight: 20,
    }),
    getIndexForOffset: vi.fn().mockReturnValue(0),
    getOffsetForIndex: vi.fn().mockReturnValue({ dx: 0, dy: 0, height: 20 }),
  },
}));

describe('TextArea Component', () => {
  let textareaComponent: TextArea;
  let props: any;

  beforeEach(() => {
    const mockContext = {
      font: '',
      measureText: vi.fn().mockReturnValue({ width: 50 }),
    };
    // @ts-ignore
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);

    document.body.innerHTML = '';

    props = {
      type: 'TextArea',
      value: 'Line 1\nLine 2',
      onChange: vi.fn(),
    };

    textareaComponent = new TextArea(props);
  });

  afterEach(() => {
    if (textareaComponent) {
      textareaComponent.dispose();
    }
  });

  it('应该创建隐藏的 textarea 元素', () => {
    const textarea = document.querySelector('textarea');
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe('Line 1\nLine 2');
  });

  it('当 props.value 改变时应该更新 textarea 值', () => {
    const newProps = { ...props, value: 'New Value' };
    textareaComponent.createElement(newProps);
    const textarea = document.querySelector('textarea');
    expect(textarea?.value).toBe('New Value');
  });

  it('应该响应 input 事件并调用 onChange', () => {
    const textarea = document.querySelector('textarea');
    if (!textarea) {
      throw new Error('Textarea not found');
    }

    textarea.value = 'Changed';
    textarea.dispatchEvent(new Event('input'));

    expect(props.onChange).toHaveBeenCalledWith('Changed');
  });

  it('拖拽选区时应阻止事件冒泡并更新选区', () => {
    const element = compileElement(textareaComponent.render()) as any;
    expect(element.type).toBe('Container');

    const stopPropagation = vi.fn();

    const downEvent = {
      x: 10,
      y: 10,
      stopPropagation,
    } as any;
    element.onPointerDown(downEvent);
    expect(stopPropagation).toHaveBeenCalled();

    stopPropagation.mockClear();
    const moveEvent = {
      x: 20,
      y: 10,
      stopPropagation,
    } as any;
    element.onPointerMove(moveEvent);
    expect(stopPropagation).toHaveBeenCalled();

    stopPropagation.mockClear();
    const upEvent = {
      x: 20,
      y: 10,
      stopPropagation,
    } as any;
    element.onPointerUp(upEvent);
    expect(stopPropagation).toHaveBeenCalled();

    // @ts-expect-error 测试用访问内部状态
    expect(textareaComponent.state.selectionStart).toBeGreaterThanOrEqual(0);
    // @ts-expect-error 测试用访问内部状态
    expect(textareaComponent.state.selectionEnd).toBeGreaterThanOrEqual(0);
  });
});
