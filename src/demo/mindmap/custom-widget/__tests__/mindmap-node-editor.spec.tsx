import { message } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MindMapNodeTextEditor } from '../mindmap-node-text-editor';

// Mock antd message
vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
  },
}));

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

class ClipboardEventMock extends Event {
  clipboardData: any;
  constructor(type: string, options: any) {
    super(type, options);
    this.clipboardData = options.clipboardData;
  }
}
global.ClipboardEvent = ClipboardEventMock as any;

describe('MindMapNodeTextEditor Text Limit', () => {
  let editor: MindMapNodeTextEditor;
  let textarea: HTMLTextAreaElement;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = ''; // Clear DOM
    editor = new MindMapNodeTextEditor({ type: 'MindMapNodeTextEditor', text: '' });
    // The editor creates a textarea and appends it to document.body
    textarea = document.querySelector('textarea')!;
  });

  afterEach(() => {
    editor.dispose();
  });

  it('should initialize with correct text', () => {
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe('');
  });

  it('should allow input within limit', () => {
    const text = 'Hello World';
    textarea.value = text;
    // Dispatch input event
    textarea.dispatchEvent(new Event('input'));

    expect((editor as any).state.text).toBe(text);
    expect(message.error).not.toHaveBeenCalled();
  });

  it('should truncate input exceeding 1500 chars', () => {
    const longText = 'a'.repeat(1501);
    textarea.value = longText;
    textarea.dispatchEvent(new Event('input'));

    expect(textarea.value.length).toBe(1500);
    expect((editor as any).state.text.length).toBe(1500);
    expect(message.error).toHaveBeenCalledWith('节点内容不能超过1500个字符');
  });

  it('should prevent keydown when limit reached', () => {
    // Set text to limit
    textarea.value = 'a'.repeat(1500);
    // Need to sync state manually or trigger input first,
    // but the handler checks textarea.value directly.

    const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    textarea.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(message.error).toHaveBeenCalledWith('节点内容不能超过1500个字符');
  });

  it('should allow deletion keys when limit reached', () => {
    textarea.value = 'a'.repeat(1500);

    const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
    textarea.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(message.error).not.toHaveBeenCalled();
  });

  it('should handle paste exceeding limit', () => {
    textarea.value = '';

    const pasteContent = 'a'.repeat(1600);
    const clipboardData = {
      getData: () => pasteContent,
    };

    const event = new ClipboardEvent('paste', {
      clipboardData: clipboardData as any,
      cancelable: true,
    });

    textarea.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    // The paste handler manually updates value and triggers input
    expect(textarea.value.length).toBe(1500);
    expect(message.error).toHaveBeenCalledWith('节点内容不能超过1500个字符');
  });

  it('should handle paste within remaining limit', () => {
    textarea.value = 'a'.repeat(1000);
    // Selection at end
    textarea.setSelectionRange(1000, 1000);

    const pasteContent = 'b'.repeat(600); // 1000 + 600 = 1600 > 1500
    const clipboardData = {
      getData: () => pasteContent,
    };

    const event = new ClipboardEvent('paste', {
      clipboardData: clipboardData as any,
      cancelable: true,
    });

    textarea.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(textarea.value.length).toBe(1500);
    // Should contain 1000 'a's and 500 'b's
    expect(textarea.value).toBe('a'.repeat(1000) + 'b'.repeat(500));
    expect(message.error).toHaveBeenCalledWith('节点内容不能超过1500个字符');
  });
});
