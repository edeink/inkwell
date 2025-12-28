import { describe, expect, it, vi } from 'vitest';

import { MindMapNodeTextEditor } from '../widgets/mindmap-node-text-editor';

describe('MindMapNodeTextEditor Esc Key', () => {
  it('Pressing Esc should trigger onCancel and not onFinish', () => {
    const onCancel = vi.fn();
    const onFinish = vi.fn();
    const editor = new MindMapNodeTextEditor({
      type: 'MindMapNodeTextEditor',
      text: 'Original',
      onCancel,
      onFinish,
    } as any);

    const input = (editor as any).input as HTMLInputElement;
    expect(input).toBeTruthy();

    // Simulate typing
    input.value = 'Draft';
    input.dispatchEvent(new Event('input'));

    // Press Esc
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });
});
