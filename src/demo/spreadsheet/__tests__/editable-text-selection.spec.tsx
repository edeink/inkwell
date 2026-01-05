import { describe, expect, it, vi } from 'vitest';

import { SpreadsheetEditableText } from '../widgets/editable-text';

import { Themes } from '@/styles/theme';

describe('SpreadsheetEditableText Selection Sync', () => {
  it('should trigger handleFinish when spreadsheet selection changes', () => {
    const onFinish = vi.fn();
    const props = {
      type: 'SpreadsheetEditableText',
      x: 0,
      y: 0,
      minWidth: 100,
      minHeight: 30,
      maxWidth: 200,
      maxHeight: 100,
      value: 'Value',
      theme: Themes.light,
      onFinish,
      onCancel: vi.fn(),
    };

    const editor = new SpreadsheetEditableText(props);

    // Dispatch custom event
    const event = new CustomEvent('spreadsheet-selection-change', {
      detail: { startRow: 1, startCol: 1, endRow: 1, endCol: 1 },
    });
    window.dispatchEvent(event);

    expect(onFinish).toHaveBeenCalledWith('Value');
  });

  it('should NOT trigger handleFinish on native text selection change', () => {
    const onFinish = vi.fn();
    const props = {
      type: 'SpreadsheetEditableText',
      x: 0,
      y: 0,
      minWidth: 100,
      minHeight: 30,
      maxWidth: 200,
      maxHeight: 100,
      value: 'Value',
      theme: Themes.light,
      onFinish,
      onCancel: vi.fn(),
    };

    const editor = new SpreadsheetEditableText(props);

    // Dispatch native selectionchange event
    // Note: 'selectionchange' is typically on document
    const event = new Event('selectionchange');
    document.dispatchEvent(event);
    // Also try on window just in case
    window.dispatchEvent(event);

    expect(onFinish).not.toHaveBeenCalled();
  });

  it('should cleanup event listener on dispose', () => {
    const onFinish = vi.fn();
    const props = {
      type: 'SpreadsheetEditableText',
      x: 0,
      y: 0,
      minWidth: 100,
      minHeight: 30,
      maxWidth: 200,
      maxHeight: 100,
      value: 'Value',
      theme: Themes.light,
      onFinish,
      onCancel: vi.fn(),
    };

    const editor = new SpreadsheetEditableText(props);

    // Dispose
    editor.dispose();

    // Dispatch event
    const event = new CustomEvent('spreadsheet-selection-change', {
      detail: { startRow: 1, startCol: 1, endRow: 1, endCol: 1 },
    });
    window.dispatchEvent(event);

    expect(onFinish).not.toHaveBeenCalled();
  });
});
