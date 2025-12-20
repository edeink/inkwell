/** @jsxImportSource @/utils/compiler */
import { message } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MindMapNodeTextEditor } from '../mindmap-node-text-editor';

// Mock antd message
vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
  },
}));

describe('MindMapNodeTextEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确初始化状态', () => {
    const editor = new MindMapNodeTextEditor({
      type: 'MindMapNodeTextEditor' as any,
      text: 'initial',
    });
    expect((editor as any).state.text).toBe('initial');
  });

  it('字数超过1500时应该截断并显示提示', () => {
    const editor = new MindMapNodeTextEditor({
      type: 'MindMapNodeTextEditor' as any,
      text: '',
    });

    const longText = 'a'.repeat(1501);

    // 模拟输入变更
    (editor as any).handleChange(longText);

    // 验证截断
    expect((editor as any).state.text.length).toBe(1500);
    expect((editor as any).state.text).toBe('a'.repeat(1500));

    // 验证提示
    expect(message.error).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '输入内容不能超过1500字',
      }),
    );
  });

  it('字数未超过限制时应该正常更新', () => {
    const editor = new MindMapNodeTextEditor({
      type: 'MindMapNodeTextEditor' as any,
      text: '',
    });
    const normalText = 'Hello World';

    (editor as any).handleChange(normalText);

    expect((editor as any).state.text).toBe(normalText);
    expect(message.error).not.toHaveBeenCalled();
  });
});
