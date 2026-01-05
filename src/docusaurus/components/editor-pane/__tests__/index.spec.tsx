import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EditorPane from '../index';

// Mock react-live
vi.mock('react-live', () => ({
  LiveProvider: ({ children }: any) => <div>{children}</div>,
  LiveEditor: ({ onChange, disabled, className }: any) => (
    <textarea
      data-testid="live-editor-textarea"
      onChange={(e) => onChange && onChange(e.target.value)}
      disabled={disabled}
      className={className}
      defaultValue="mock content"
    />
  ),
}));

// Mock icons
vi.mock('@ant-design/icons', () => ({
  CopyOutlined: () => <span className="anticon-copy">CopyIcon</span>,
  DownOutlined: () => <span>DownIcon</span>,
}));

// Mock Runtime and Core
vi.mock('@/core', () => ({}));
vi.mock('@/runtime', () => ({
  default: class MockRuntime {},
}));

// Mock clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('EditorPane', () => {
  let container: HTMLDivElement;
  let root: any;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockWriteText.mockReset();
    mockWriteText.mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders correctly', async () => {
    await act(async () => {
      root.render(<EditorPane value="const a = 1;" />);
    });
    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();
  });

  it('handles button copy correctly', async () => {
    await act(async () => {
      root.render(<EditorPane value="const a = 1;" />);
    });

    // Find copy button (it has copyBtn class in real code, but here we mocked icon inside button)
    // The button has aria-label="复制代码"
    const copyBtn = container.querySelector('button[aria-label="复制代码"]');
    expect(copyBtn).not.toBeNull();

    // Click it
    await act(async () => {
      copyBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockWriteText).toHaveBeenCalledWith('const a = 1;');

    // Check feedback (async)
    await act(async () => {
      // Allow promise callback to run
    });

    const toast = container.querySelector('.copyToast'); // Need to check class name or text
    // The component uses styles.copyToast. Since we use CSS modules, checking class name is hard unless we mock styles.
    // We can check text content.
    expect(container.textContent).toContain('复制成功');

    // Fast forward timer
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(container.textContent).not.toContain('复制成功');
  });

  it('handles Ctrl+C (clipboard copy) correctly', async () => {
    await act(async () => {
      root.render(<EditorPane value="const a = 1;" />);
    });

    const editorContent = container.querySelector('div[aria-live="off"]');
    expect(editorContent).not.toBeNull();

    // Simulate copy event bubbling up
    await act(async () => {
      // Use ClipboardEvent if available, otherwise Event
      const event = new Event('copy', { bubbles: true, cancelable: true });
      editorContent?.dispatchEvent(event);
    });

    expect(container.textContent).toContain('复制成功');

    // Timer should hide it
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.textContent).not.toContain('复制成功');
  });

  it('handles copy error gracefully', async () => {
    mockWriteText.mockRejectedValue(new Error('Failed'));

    await act(async () => {
      root.render(<EditorPane value="const a = 1;" />);
    });

    const copyBtn = container.querySelector('button[aria-label="复制代码"]');

    await act(async () => {
      copyBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Wait for promise rejection handling
    await act(async () => {
      // Allow promise chain to complete
    });

    expect(container.textContent).toContain('复制失败');
  });

  it('uses fallback when navigator.clipboard is missing', async () => {
    // Remove clipboard mock temporarily
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    const execCommandMock = vi.fn();
    document.execCommand = execCommandMock;

    await act(async () => {
      root.render(<EditorPane value="fallback content" />);
    });

    const copyBtn = container.querySelector('button[aria-label="复制代码"]');
    await act(async () => {
      copyBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(container.textContent).toContain('复制成功');

    // Restore
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });
});
