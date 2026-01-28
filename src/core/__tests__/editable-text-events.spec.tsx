import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TextArea } from '../editable/textarea';

describe('TextArea 键盘事件', () => {
  let editor: TextArea;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    editor?.dispose();
  });

  it('disabled=true 时应阻止默认按键行为', () => {
    editor = new TextArea({ value: 'hello', disabled: true });
    const input = document.querySelector('textarea');
    if (!input) {
      throw new Error('找不到 textarea 元素');
    }
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('onKeyDown 返回 false 时应阻止默认行为', () => {
    const onKeyDown = vi.fn(() => false);
    editor = new TextArea({ value: 'hello', onKeyDown });
    const input = document.querySelector('textarea');
    if (!input) {
      throw new Error('找不到 textarea 元素');
    }
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    input.dispatchEvent(event);
    expect(onKeyDown).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });
});
