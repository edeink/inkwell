import { describe, expect, it, vi, beforeAll } from 'vitest';

import { EditableTextDemo } from '../editable-text/app';
import { MarkdownPreviewApp } from '../markdown-preview/app';
import { MarkdownViewer } from '../markdown-preview/widgets/markdown-viewer';
import { NodeType } from '../markdown-preview/widgets/markdown-viewer/../../utils/parser';
import { BlockNodeRenderer } from '../markdown-preview/widgets/markdown-viewer/block-renderer';

import { EditableText, Container, Text } from '@/core';
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

describe('Demo Theme Support', () => {
  describe('EditableTextDemo', () => {
    it('should use light theme colors by default', () => {
      const demo = new EditableTextDemo({ type: 'EditableTextDemo' });
      const tree = demo.render() as any;

      const theme = Themes.light;

      // Navigate to EditableText
      // Padding -> Column -> [Text, Row] -> Row -> [Column, Column] -> Column -> [Text, Container, Text] -> Container -> Padding -> EditableText
      const mainColumn = tree.props.children;
      const titleText = mainColumn.props.children[0];

      expect(titleText.props.color).toBe(theme.text.primary);

      const row = mainColumn.props.children[1];
      const col1 = row.props.children[0];
      const container1 = col1.props.children[1];

      expect(container1.props.color).toBe(theme.background.container);
      expect(container1.props.border.color).toBe(theme.border.base);

      const editable1 = container1.props.children.props.children;
      expect(editable1.props.color).toBe(theme.text.primary);
      expect(editable1.props.selectionColor).toBe(theme.state.focus);
      expect(editable1.props.cursorColor).toBe(theme.text.primary);
    });

    it('should use dark theme colors when provided', () => {
      const theme = Themes.dark;
      const demo = new EditableTextDemo({ type: 'EditableTextDemo', theme });
      const tree = demo.render() as any;

      const mainColumn = tree.props.children;
      const titleText = mainColumn.props.children[0];

      expect(titleText.props.color).toBe(theme.text.primary);

      const row = mainColumn.props.children[1];
      const col1 = row.props.children[0];
      const container1 = col1.props.children[1];

      expect(container1.props.color).toBe(theme.background.container);
      expect(container1.props.border.color).toBe(theme.border.base);

      const editable1 = container1.props.children.props.children;
      expect(editable1.props.color).toBe(theme.text.primary);
      expect(editable1.props.selectionColor).toBe(theme.state.focus);
    });
  });

  describe('MarkdownPreviewApp', () => {
    it('should pass theme to MarkdownViewer', () => {
      const theme = Themes.dark;
      const app = MarkdownPreviewApp({ width: 800, height: 600, theme });

      // ScrollView -> Container -> Container -> MarkdownViewer
      const scrollView = app;
      const outerContainer = scrollView.props.children;
      expect(outerContainer.props.color).toBe(theme.background.surface);

      const innerContainer = outerContainer.props.children;
      expect(innerContainer.props.color).toBe(theme.background.container);
      expect(innerContainer.props.decoration.boxShadow.color).toBe(theme.state.active);

      const markdownViewer = innerContainer.props.children;
      expect(markdownViewer.props.theme).toBe(theme);
    });
  });

  describe('MarkdownViewer & Renderers', () => {
    it('should render headers with theme colors', () => {
      const theme = Themes.dark;
      // Manually invoke BlockNodeRenderer for a header
      const node = {
        type: NodeType.Header,
        level: 1,
        children: [{ type: NodeType.Text, content: 'Title' }],
      };
      const result = BlockNodeRenderer({ node, theme }) as any;

      // Padding -> Text
      const text = result.props.children;
      expect(text.props.color).toBe(theme.text.primary);
    });

    it('should render code blocks with theme background', () => {
      const theme = Themes.dark;
      const node = { type: NodeType.CodeBlock, content: 'code', language: 'js' };
      const result = BlockNodeRenderer({ node, theme }) as any;

      // Container -> Padding -> Highlighter
      expect(result.props.color).toBe(theme.component.headerBg);
    });
  });
});
