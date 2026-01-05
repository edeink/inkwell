import { describe, expect, it, vi } from 'vitest';

import { SpreadsheetEditableText } from '../widgets/editable-text';

import { Themes } from '@/styles/theme';

describe('SpreadsheetEditableText Data Cleanup', () => {
  it('should clear content on finish', () => {
    const onFinish = vi.fn();
    const onCancel = vi.fn();
    const props = {
      type: 'SpreadsheetEditableText',
      x: 0,
      y: 0,
      minWidth: 100,
      minHeight: 30,
      maxWidth: 200,
      maxHeight: 100,
      value: 'Initial',
      theme: Themes.light,
      onFinish,
      onCancel,
    };

    const editor = new SpreadsheetEditableText(props);

    // Check initial state
    expect((editor as any).state.value).toBe('Initial');

    // Simulate change
    // @ts-ignore - private method
    editor.handleChange('Updated');
    expect((editor as any).state.value).toBe('Updated');

    // Simulate finish
    // @ts-ignore - private method
    editor.handleFinish('Updated');

    expect(onFinish).toHaveBeenCalledWith('Updated');

    // Requirement: Clear content after finish
    expect((editor as any).state.value).toBe('');
  });

  it('should not leak data between sessions', () => {
    const onFinish = vi.fn();
    const props = {
      type: 'SpreadsheetEditableText',
      x: 0,
      y: 0,
      minWidth: 100,
      minHeight: 30,
      maxWidth: 200,
      maxHeight: 100,
      value: 'Session 1',
      theme: Themes.light,
      onFinish,
      onCancel: vi.fn(),
    };

    const editor = new SpreadsheetEditableText(props);
    expect((editor as any).state.value).toBe('Session 1');

    // Edit
    // @ts-ignore
    editor.handleChange('Session 1 Updated');
    // Finish
    // @ts-ignore
    editor.handleFinish('Session 1 Updated');

    expect((editor as any).state.value).toBe('');

    // Simulate Re-entry (new props)
    // In React/Framework, this would be either new instance or update
    // If update (same instance):
    const newProps = { ...props, value: 'Session 2' };
    editor.createElement(newProps);

    // Should reflect new props value, not old garbage
    expect((editor as any).state.value).toBe('Session 2');
  });
});
