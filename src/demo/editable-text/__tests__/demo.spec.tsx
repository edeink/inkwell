import { beforeAll, describe, expect, it, vi } from 'vitest';

import { EditableTextDemo } from '../app';

import { EditableText } from '@/core';
import { Themes } from '@/styles/theme';

// Mock Canvas
beforeAll(() => {
  if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      measureText: () => ({ width: 0 }),
      font: '',
    })) as any;
  }
});

describe('EditableTextDemo', () => {
  it('应该渲染两个编辑器', () => {
    const demo = new EditableTextDemo({ type: 'EditableTextDemo', theme: Themes.light });
    const tree = demo.render() as any;

    // Padding -> Column -> [Text, Row]
    const column = tree.props.children;
    const row = column.props.children[1];
    expect(row.props.children).toHaveLength(2);

    const col1 = row.props.children[0];
    const col2 = row.props.children[1];

    // Check Single Line Editor
    // Column -> [Text, Container, Text]
    const container1 = col1.props.children[1];
    // Container -> Padding -> EditableText
    const editable1 = container1.props.children.props.children;
    expect(editable1.type).toBe(EditableText);
    expect(editable1.props.value).toBe(demo.state.singleLineValue);
    expect(editable1.props.multiline).toBeUndefined();

    // Check Multi Line Editor
    const container2 = col2.props.children[1];
    const editable2 = container2.props.children.props.children;
    expect(editable2.type).toBe(EditableText);
    expect(editable2.props.value).toBe(demo.state.multiLineValue);
    expect(editable2.props.multiline).toBe(true);
  });

  it('更新单行编辑器内容应该更新状态', () => {
    const demo = new EditableTextDemo({ type: 'EditableTextDemo', theme: Themes.light });
    const tree = demo.render() as any;
    const column = tree.props.children;
    const row = column.props.children[1];
    const col1 = row.props.children[0];
    const container1 = col1.props.children[1];
    const editable1 = container1.props.children.props.children;

    editable1.props.onChange('New Value');
    expect(demo.state.singleLineValue).toBe('New Value');
  });

  it('更新多行编辑器内容应该更新状态', () => {
    const demo = new EditableTextDemo({ type: 'EditableTextDemo', theme: Themes.light });
    const tree = demo.render() as any;
    const column = tree.props.children;
    const row = column.props.children[1];
    const col2 = row.props.children[1];
    const container2 = col2.props.children[1];
    const editable2 = container2.props.children.props.children;

    editable2.props.onChange('Line 1\nLine 2');
    expect(demo.state.multiLineValue).toBe('Line 1\nLine 2');
  });
});
