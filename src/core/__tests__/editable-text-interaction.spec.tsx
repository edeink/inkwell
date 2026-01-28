/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TextArea } from '../editable/textarea';

describe('TextArea 交互', () => {
  let editor: TextArea;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    editor = new TextArea({
      value: 'Hello',
      onFocus: vi.fn(),
      onBlur: vi.fn(),
    });
  });

  afterEach(() => {
    editor.dispose();
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('聚焦与失焦应更新状态并触发回调', () => {
    const input = document.querySelector('textarea');
    if (!input) {
      throw new Error('找不到 textarea 元素');
    }

    input.dispatchEvent(new Event('focus'));
    expect((editor as any).state.focused).toBe(true);
    expect((editor as any).state.cursorVisible).toBe(true);
    expect(editor.props.onFocus).toHaveBeenCalled();

    input.dispatchEvent(new Event('blur'));
    expect((editor as any).state.focused).toBe(false);
    expect((editor as any).state.cursorVisible).toBe(false);
    expect(editor.props.onBlur).toHaveBeenCalled();
  });

  it('聚焦后光标应按 500ms 周期闪烁', () => {
    const input = document.querySelector('textarea');
    if (!input) {
      throw new Error('找不到 textarea 元素');
    }

    input.dispatchEvent(new Event('focus'));
    expect((editor as any).state.cursorVisible).toBe(true);

    vi.advanceTimersByTime(500);
    expect((editor as any).state.cursorVisible).toBe(false);

    vi.advanceTimersByTime(500);
    expect((editor as any).state.cursorVisible).toBe(true);

    input.dispatchEvent(new Event('blur'));
    expect((editor as any).state.cursorVisible).toBe(false);
  });
});
