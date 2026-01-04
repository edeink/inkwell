import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditableText, type EditableTextProps } from '../editable-text';

// Mock Widget from @/core/base
vi.mock('@/core/base', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/base')>();

  class MockWidget {
    props: any;
    state: any;
    renderObject: any = { offset: { dx: 0, dy: 0 }, size: { width: 0, height: 0 } };
    parent: any = null;
    _dirty: boolean = false;

    constructor(props: any) {
      this.props = props;
    }

    dispose() {}
    markDirty() {}
    createElement(data: any) {
      this.props = data;
      return this;
    }
  }

  return {
    ...actual,
    Widget: MockWidget,
  };
});

// Mock other core components to avoid rendering issues
vi.mock('@/core', () => ({
  Container: () => ({ type: 'Container', props: {} }),
  Stack: () => ({ type: 'Stack', props: {} }),
  Text: () => ({ type: 'Text', props: {} }),
}));

vi.mock('@/core/positioned', () => ({
  Positioned: () => ({ type: 'Positioned', props: {} }),
}));

describe('EditableText Core Component', () => {
  let editor: EditableText;
  let props: EditableTextProps;

  beforeEach(() => {
    // Mock canvas context
    const mockContext = {
      font: '',
      measureText: vi.fn().mockReturnValue({ width: 50 }),
    };
    // @ts-ignore
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);

    document.body.innerHTML = '';

    props = {
      // @ts-ignore
      type: 'EditableText',
      value: 'Hello',
      onChange: vi.fn(),
      onFinish: vi.fn(),
      onCancel: vi.fn(),
      getViewState: vi.fn().mockReturnValue({ scale: 1, tx: 0, ty: 0 }),
      stopTraversalAt: vi.fn(),
    };

    editor = new EditableText(props);
  });

  afterEach(() => {
    if (editor) {
      editor.dispose();
    }
  });

  it('应该在初始化时创建隐藏的 input 元素 (Should create hidden input on init)', () => {
    const input = document.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('Hello');
    expect(input?.style.opacity).toBe('0');
    expect(input?.style.position).toBe('fixed');
  });

  it('当 props.value 改变时应该更新 input 值 (Should update input value when props.value changes)', () => {
    const newProps = { ...props, value: 'World' };
    editor.createElement(newProps);
    const input = document.querySelector('input');
    expect(input?.value).toBe('World');
  });

  it('应该正确处理输入事件 (Should handle input events)', () => {
    const input = document.querySelector('input');
    if (!input) {
      throw new Error('Input not found');
    }

    input.value = 'Hello World';
    input.dispatchEvent(new Event('input'));

    expect(props.onChange).toHaveBeenCalledWith('Hello World');
  });

  it('应该在按下 Enter 键时调用 onFinish (Should call onFinish on Enter key)', () => {
    const input = document.querySelector('input');
    if (!input) {
      throw new Error('Input not found');
    }

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    input.dispatchEvent(event);

    expect(props.onFinish).toHaveBeenCalledWith('Hello');
  });

  it('应该在按下 Escape 键时调用 onCancel (Should call onCancel on Escape key)', () => {
    const input = document.querySelector('input');
    if (!input) {
      throw new Error('Input not found');
    }

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    input.dispatchEvent(event);

    expect(props.onCancel).toHaveBeenCalled();
  });

  it('应该在 blur 时调用 onFinish (Should call onFinish on blur)', async () => {
    const input = document.querySelector('input');
    if (!input) {
      throw new Error('Input not found');
    }

    // 使用 fake timers
    vi.useFakeTimers();

    input.dispatchEvent(new Event('blur'));

    vi.advanceTimersByTime(100);

    expect(props.onFinish).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
