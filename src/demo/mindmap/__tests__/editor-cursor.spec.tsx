import { describe, expect, it, vi } from 'vitest';

import { MindMapNodeTextEditor } from '../widgets/mindmap-node-text-editor';

import { Container } from '@/core/container';
import { Positioned } from '@/core/positioned';

// 模拟 canvas 上下文用于文本测量
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  measureText: vi.fn(() => ({ width: 10 })),
  font: '',
})) as any;

describe('MindMap 光标与编辑器', () => {
  it('Container 属性变更时应更新 cursor', () => {
    const container = new Container({ type: 'Container', cursor: 'default' });
    expect(container.cursor).toBe('default');

    // 模拟更新
    container.createElement({ type: 'Container', cursor: 'pointer' });
    expect(container.cursor).toBe('pointer');
  });

  it('MindMapNodeTextEditor 应渲染 1px 光标', () => {
    const editor = new MindMapNodeTextEditor({ type: 'MindMapNodeTextEditor', text: 'Hello' });
    // 强制测量上下文
    (editor as any).state.measureCtx = {
      measureText: () => ({ width: 10 }),
      font: '',
    };

    // 折叠选区以显示光标
    editor.setState({
      selectionStart: 5,
      selectionEnd: 5,
      isFocused: true,
      cursorVisible: true,
    } as any);

    // 渲染
    const stack = editor.render();
    const children = (stack as any).props.children;
    // 子元素: [selectionRect, Text, cursor]
    // 光标可能是最后一个
    const cursorPositioned = children[2];

    expect(cursorPositioned).not.toBeNull();
    if (cursorPositioned) {
      expect(cursorPositioned.type).toBe(Positioned);
      expect(cursorPositioned.props.width).toBe(1);
    }
  });

  it('文本选中时 MindMapNodeTextEditor 应隐藏光标', () => {
    const editor = new MindMapNodeTextEditor({ type: 'MindMapNodeTextEditor', text: 'Hello' });

    // 模拟选中 (minS !== maxS)
    editor.setState({
      selectionStart: 0,
      selectionEnd: 5, // 全选
      isFocused: true,
      cursorVisible: true,
    } as any);

    const stack = editor.render();
    const children = (stack as any).props.children;
    const cursorPositioned = children[2];

    expect(cursorPositioned).toBeNull();
  });

  it('选区折叠时 MindMapNodeTextEditor 应显示光标', () => {
    const editor = new MindMapNodeTextEditor({ type: 'MindMapNodeTextEditor', text: 'Hello' });

    // 模拟折叠选区
    editor.setState({
      selectionStart: 5,
      selectionEnd: 5,
      isFocused: true,
      cursorVisible: true,
    } as any);

    const stack = editor.render();
    const children = (stack as any).props.children;
    const cursorPositioned = children[2];

    expect(cursorPositioned).not.toBeNull();
    expect(cursorPositioned.props.width).toBe(1);
  });
});
