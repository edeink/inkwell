import { describe, expect, it, vi } from 'vitest';

import { EditableText } from '../editable-text';

describe('EditableText 事件', () => {
  it('单行模式下按 Enter 键应触发 onFinish', () => {
    const onFinish = vi.fn();
    const editable = new EditableText({
      type: 'EditableText',
      value: 'hello',
      onFinish,
    });

    // 模拟 Enter 键按下
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    // @ts-ignore - 为了测试访问私有方法
    editable.handleInputKeyDown(enterEvent);

    // 应该触发 blur，从而触发 onFinish
    // 但是 handleInputKeyDown 调用 blur()，这是基于浏览器异步/事件的
    // 在这个环境中，我们可能需要手动触发 blur 或检查 blur 是否被调用
    // 因为我们无法轻易模拟内部创建的 input 元素的 DOM blur 行为，
    // 我们可能需要检查内部逻辑是否尝试调用 blur。

    // 然而，handleBlur 是由 'blur' 事件监听器调用的。
    // 我们可以直接模拟 blur 事件处理程序。

    // 让我们验证 handleInputKeyDown 是否调用 input.blur()
    // 我们需要模拟 input 元素
    const inputMock = {
      blur: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      style: {},
    } as unknown as HTMLInputElement;

    // @ts-ignore
    editable.input = inputMock;

    // @ts-ignore
    editable.handleInputKeyDown(enterEvent);

    expect(inputMock.blur).toHaveBeenCalled();

    // 现在模拟由 input.blur() 触发的 blur 事件
    // @ts-ignore
    editable.handleBlur();

    expect(onFinish).toHaveBeenCalledWith('hello');
  });

  it('按 Escape 键应触发 onCancel', () => {
    const onCancel = vi.fn();
    const onFinish = vi.fn();
    const editable = new EditableText({
      type: 'EditableText',
      value: 'hello',
      onCancel,
      onFinish,
    });

    const inputMock = {
      blur: vi.fn().mockImplementation(() => {
        // 模拟同步 blur 事件
        // @ts-ignore
        editable.handleBlur();
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      style: {},
    } as unknown as HTMLInputElement;

    // @ts-ignore
    editable.input = inputMock;

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    // @ts-ignore
    editable.handleInputKeyDown(escapeEvent);

    expect(inputMock.blur).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();

    // onFinish 不应被调用，因为我们在取消
    expect(onFinish).not.toHaveBeenCalled();
  });
});
