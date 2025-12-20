import { describe, expect, it, vi } from 'vitest';

import { MindMapNodeTextEditor } from '../mindmap-node-text-editor';

import { Container } from '@/core/container';
import { Positioned } from '@/core/positioned';

// Mock canvas context for text measurement
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  measureText: vi.fn(() => ({ width: 10 })),
  font: '',
})) as any;

describe('MindMap Cursor & Editor', () => {
  it('Container should update cursor property when props change', () => {
    const container = new Container({ type: 'Container', cursor: 'default' });
    expect(container.cursor).toBe('default');

    // Simulate update
    container.createElement({ type: 'Container', cursor: 'pointer' });
    expect(container.cursor).toBe('pointer');
  });

  it('MindMapNodeTextEditor should render 1px cursor', () => {
    const editor = new MindMapNodeTextEditor({ type: 'MindMapNodeTextEditor', text: 'Hello' });
    // Force measure context
    (editor as any).state.measureCtx = {
      measureText: () => ({ width: 10 }),
      font: '',
    };

    // Collapse selection to show cursor
    editor.setState({
      selectionStart: 5,
      selectionEnd: 5,
      isFocused: true,
      cursorVisible: true,
    } as any);

    // Render
    const stack = editor.render();
    const children = (stack as any).props.children;
    // Children: [selectionRect, Text, cursor]
    // Cursor is likely the last one
    const cursorPositioned = children[2];

    expect(cursorPositioned).not.toBeNull();
    if (cursorPositioned) {
      expect(cursorPositioned.type).toBe(Positioned);
      expect(cursorPositioned.props.width).toBe(1);
    }
  });

  it('MindMapNodeTextEditor should hide cursor when text is selected', () => {
    const editor = new MindMapNodeTextEditor({ type: 'MindMapNodeTextEditor', text: 'Hello' });

    // Simulate selection (minS !== maxS)
    editor.setState({
      selectionStart: 0,
      selectionEnd: 5, // Select all
      isFocused: true,
      cursorVisible: true,
    } as any);

    const stack = editor.render();
    const children = (stack as any).props.children;
    const cursorPositioned = children[2];

    expect(cursorPositioned).toBeNull();
  });

  it('MindMapNodeTextEditor should show cursor when selection is collapsed', () => {
    const editor = new MindMapNodeTextEditor({ type: 'MindMapNodeTextEditor', text: 'Hello' });

    // Simulate collapsed selection
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
