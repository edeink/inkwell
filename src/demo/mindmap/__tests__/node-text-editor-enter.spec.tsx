import { describe, expect, it, vi } from 'vitest';

import { MindMapNodeTextEditor } from '../widgets/mindmap-node-text-editor';

describe('文本编辑器回车确认', () => {
  it('编辑状态下按下 Enter 应触发完成回调', () => {
    const onFinish = vi.fn();
    const editor = new MindMapNodeTextEditor({
      type: 'MindMapNodeTextEditor',
      text: '你好',
      onFinish,
    } as any);

    const input = (editor as any).input as HTMLInputElement | null;
    expect(input).toBeTruthy();
    if (!input) {
      return;
    }

    const ev = new KeyboardEvent('keydown', { key: 'Enter' });
    input.dispatchEvent(ev);

    expect(onFinish).toHaveBeenCalledWith('你好');
  });
});
