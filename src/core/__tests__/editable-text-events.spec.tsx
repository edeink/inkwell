import { describe, expect, it, vi } from 'vitest';

import { EditableText } from '../editable-text';

describe('EditableText Events', () => {
  it('should trigger onFinish when Enter is pressed in single line mode', () => {
    const onFinish = vi.fn();
    const editable = new EditableText({
      type: 'EditableText',
      value: 'hello',
      onFinish,
    });

    // Simulate Enter key press
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    // @ts-ignore - accessing private method for testing
    editable.handleInputKeyDown(enterEvent);

    // Should trigger blur, which triggers onFinish
    // But handleInputKeyDown calls blur() which is async/event-based in browser
    // In this environment, we might need to manually trigger blur or check if blur was called
    // Since we can't easily mock the DOM blur behavior on the input element created internally,
    // we might need to check if the internal logic attempts to blur.

    // However, handleBlur is called by the 'blur' event listener.
    // We can simulate the blur event handler directly.

    // Let's verify that handleInputKeyDown calls input.blur()
    // We need to mock the input element
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

    // Now simulate the blur event which would be triggered by input.blur()
    // @ts-ignore
    editable.handleBlur();

    expect(onFinish).toHaveBeenCalledWith('hello');
  });

  it('should trigger onCancel when Escape is pressed', () => {
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
        // Simulate synchronous blur event
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

    // onFinish should NOT be called because we are cancelling
    expect(onFinish).not.toHaveBeenCalled();
  });
});
