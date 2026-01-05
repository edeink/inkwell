import { describe, expect, it, vi } from 'vitest';

import { SpreadsheetEditableText } from '../editable-text';

import { Container } from '@/core/container';
import { Positioned } from '@/core/positioned';
import { Stack } from '@/core/stack';
import { ScrollView } from '@/core/viewport/scroll-view';
import { Themes } from '@/styles/theme';

// Mock TextLayout
vi.mock('@/core/text/layout', () => ({
  TextLayout: {
    layout: (text: string, style: any, constraints: any) => {
      // Mock layout logic: 10px per char width, 20px height
      const width = text.length * 10;
      const height = 20;
      return { width, height };
    },
  },
}));

describe('SpreadsheetEditableText', () => {
  const defaultProps = {
    type: 'SpreadsheetEditableText',
    x: 0,
    y: 0,
    minWidth: 50,
    minHeight: 30,
    maxWidth: 200,
    maxHeight: 100,
    value: 'test',
    theme: Themes.light,
    onFinish: vi.fn(),
    onCancel: vi.fn(),
  };

  it('应该根据内容计算初始尺寸', () => {
    const widget = new SpreadsheetEditableText(defaultProps);
    // test (4 chars) -> 40px width + 10px padding = 50px
    // But minWidth is 50.
    // let's try longer text
    const longProps = { ...defaultProps, value: 'longtext' }; // 80px + 10 = 90px
    const widget2 = new SpreadsheetEditableText(longProps);

    // Access state directly for testing
    // @ts-ignore
    expect(widget2.state.width).toBe(90);
    // @ts-ignore
    expect(widget2.state.height).toBeGreaterThanOrEqual(20);
  });

  it('当内容超过最大尺寸时应该使用 ScrollView', () => {
    // 25 chars -> 250px width > 200px maxWidth
    const props = { ...defaultProps, value: 'a'.repeat(25) };
    const widget = new SpreadsheetEditableText(props);

    const tree = widget.render();

    // Check if the inner structure contains ScrollView
    // Stack -> Positioned -> Container -> ScrollView (if needed) -> Container -> EditableText

    // Stack
    const stackElement = tree as any;
    expect(stackElement.type).toBe(Stack);

    // Positioned
    // Stack children is usually an array
    const children = Array.isArray(stackElement.props.children)
      ? stackElement.props.children
      : [stackElement.props.children];
    const positionedElement = children[0];
    expect(positionedElement.type).toBe(Positioned);

    const outerContainerElement = positionedElement.props.children || positionedElement.props.child; // Container
    expect(outerContainerElement.type).toBe(Container);

    const innerContentElement =
      outerContainerElement.props.children || outerContainerElement.props.child; // ScrollView or Container(EditableText)

    // Since width (260) > maxWidth (200), it should be ScrollView
    expect(innerContentElement.type).toBe(ScrollView);
  });

  it('当内容未超过最大尺寸时应该直接渲染内容', () => {
    const props = { ...defaultProps, value: 'short' }; // 60px < 200px
    const widget = new SpreadsheetEditableText(props);

    const tree = widget.render();

    const stackElement = tree as any;
    const children = Array.isArray(stackElement.props.children)
      ? stackElement.props.children
      : [stackElement.props.children];
    const positionedElement = children[0];
    const outerContainerElement = positionedElement.props.children || positionedElement.props.child;
    const innerContentElement =
      outerContainerElement.props.children || outerContainerElement.props.child;

    // Should be Container (wrapper of CoreEditableText), not ScrollView
    expect(innerContentElement.type).toBe(Container);
    expect(innerContentElement.type).not.toBe(ScrollView);
  });

  it('当输入改变时应该更新尺寸', () => {
    const widget = new SpreadsheetEditableText(defaultProps);
    // @ts-ignore
    const handleChange = widget['handleChange'];

    // 'verylongtext' -> 12 chars -> 120px + 10 = 130px
    handleChange('verylongtext');

    // @ts-ignore
    expect(widget.state.width).toBe(130);
  });
});
