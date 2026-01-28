import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TextArea, type TextAreaProps } from '../editable/textarea';

describe('TextArea 基础交互', () => {
  let editor: TextArea;
  let props: TextAreaProps;

  beforeEach(() => {
    document.body.innerHTML = '';

    props = {
      value: 'Hello',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      onKeyDown: vi.fn(),
    };

    editor = new TextArea(props);
  });

  afterEach(() => {
    editor.dispose();
  });

  it('初始化时应创建隐藏的 textarea 元素', () => {
    const input = document.querySelector('textarea');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('Hello');
    expect(input?.style.opacity).toBe('0');
    expect(input?.style.position).toBe('fixed');
  });

  it('props.value 改变时应同步更新 textarea 的值', () => {
    const nextProps = { ...props, value: 'World' };
    editor.createElement(nextProps);
    const input = document.querySelector('textarea');
    expect(input?.value).toBe('World');
  });

  it('输入事件应触发 onChange', () => {
    const input = document.querySelector('textarea');
    if (!input) {
      throw new Error('找不到 textarea 元素');
    }

    input.value = 'Hello World';
    input.dispatchEvent(new Event('input'));
    expect(props.onChange).toHaveBeenCalledWith('Hello World');
  });

  it('按键事件应触发 onKeyDown 且可阻止默认行为', () => {
    const input = document.querySelector('textarea');
    if (!input) {
      throw new Error('找不到 textarea 元素');
    }

    const onKeyDown = vi.fn(() => false);
    editor.createElement({ ...props, onKeyDown });

    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    input.dispatchEvent(event);

    expect(onKeyDown).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('失焦事件应触发 onBlur', () => {
    const input = document.querySelector('textarea');
    if (!input) {
      throw new Error('找不到 textarea 元素');
    }
    input.dispatchEvent(new Event('blur'));
    expect(props.onBlur).toHaveBeenCalled();
  });
});
