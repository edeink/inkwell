import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MindMapNodeTextEditor } from '../widgets/mindmap-node-text-editor';

describe('MindMapNodeTextEditor 状态切换测试', () => {
  let editor: MindMapNodeTextEditor;
  let onFinish: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;
  let mockInput: HTMLInputElement;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'Date',
      ],
    });

    // Mock callbacks
    onFinish = vi.fn();
    onCancel = vi.fn();

    // Mock DOM elements
    mockInput = document.createElement('input');
    mockInput.focus = vi.fn();
    mockInput.blur = vi.fn();
    mockInput.remove = vi.fn();

    mockCanvas = document.createElement('canvas');
    mockCanvas.setAttribute('data-inkwell-id', 'test-canvas');
    mockCanvas.focus = vi.fn();

    // Mock document methods
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      if (tagName === 'input') {
        return mockInput;
      }
      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas', options);
        canvas.getContext = vi.fn(() => ({
          measureText: () => ({ width: 10 }),
          font: '',
        })) as any;
        return canvas;
      }
      return originalCreateElement(tagName, options);
    });

    vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === 'canvas[data-inkwell-id]') {
        return mockCanvas;
      }
      return null;
    });

    // Mock activeElement
    Object.defineProperty(document, 'activeElement', {
      value: mockInput,
      writable: true,
    });

    // Create editor instance
    editor = new MindMapNodeTextEditor({
      type: 'MindMapNodeTextEditor',
      text: '测试文本',
      onFinish,
      onCancel,
    } as any);

    // Manually trigger initialization effects normally handled by framework
    // Since we are unit testing the class directly without the full framework runtime
    (editor as any).createHiddenInput();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('防止快速连续操作导致多次状态切换', () => {
    // 模拟第一次 Enter
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    event.preventDefault = vi.fn();
    event.stopPropagation = vi.fn();
    (editor as any).handleInputKeyDown(event);

    // 模拟第二次 Enter
    (editor as any).handleInputKeyDown(event);

    // 模拟 Blur (可能由 input.blur() 触发)
    (editor as any).handleBlur();

    vi.advanceTimersByTime(350);

    // 验证只调用了一次 onFinish
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('Tab 键导致失去焦点应触发完成', () => {
    // 模拟 Tab 键导致 activeElement 改变并触发 blur
    // 模拟焦点移到 body 或其他元素
    Object.defineProperty(document, 'activeElement', {
      value: document.body,
      writable: true,
    });

    // 触发 blur
    (editor as any).handleBlur();

    vi.advanceTimersByTime(350);

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('如果焦点不在 input 上，退出时不应强制聚焦 Canvas', () => {
    // 模拟焦点在 body 上
    Object.defineProperty(document, 'activeElement', {
      value: document.body,
      writable: true,
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    event.preventDefault = vi.fn();
    event.stopPropagation = vi.fn();
    (editor as any).handleInputKeyDown(event);

    vi.advanceTimersByTime(350);

    // 应该聚焦 Canvas (因为 activeElement 是 body)
    expect(mockCanvas.focus).toHaveBeenCalled();
  });

  it('如果焦点在其他元素上，退出时不应抢夺焦点', () => {
    // 模拟焦点在其他 input 上
    const otherElement = document.createElement('div');
    otherElement.tabIndex = 0;

    Object.defineProperty(document, 'activeElement', {
      value: otherElement,
      writable: true,
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    event.preventDefault = vi.fn();
    event.stopPropagation = vi.fn();
    (editor as any).handleInputKeyDown(event);

    vi.advanceTimersByTime(350);

    // 不应聚焦 Canvas
    expect(mockCanvas.focus).not.toHaveBeenCalled();
  });
});
