import { beforeAll, describe, expect, it, vi } from 'vitest';

import { EditableTextDemo } from '../editable-text/app';
import { BlockNodeRenderer } from '../wiki/widgets/markdown-preview/block-renderers';
import { NodeType } from '../wiki/widgets/markdown-preview/parser';
import { WikiContent } from '../wiki/widgets/wiki-content';

import { Themes } from '@/styles/theme';

// 模拟 Canvas（避免在测试环境中访问真实渲染上下文）
beforeAll(() => {
  if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      measureText: () => ({ width: 0 }),
      font: '',
    })) as any;
  }
});

describe('示例主题支持', () => {
  describe('EditableTextDemo', () => {
    it('默认应使用浅色主题颜色', () => {
      const demo = new EditableTextDemo({ type: 'EditableTextDemo' });
      const tree = demo.render() as any;

      const theme = Themes.light;

      // 定位到输入组件节点
      // Padding -> Column -> [Text, Row] -> Row -> [Column, Column] -> Column -> [Text, Container, Text] -> Container -> Padding -> Input/TextArea
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

    it('传入深色主题时应使用深色主题颜色', () => {
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

  describe('WikiContent', () => {
    it('WikiContent 应使用主题背景色', () => {
      const theme = Themes.dark;
      const widget = new WikiContent({
        type: 'WikiContent',
        width: 800,
        height: 600,
        theme,
        doc: {
          key: 'sample',
          path: 'sample.md',
          title: '示例',
          content: '# 标题\n\n正文',
        },
      } as any);
      const tree = widget.render() as any;
      expect(tree.props.color).toBe(theme.background.surface);
    });
  });

  describe('MarkdownViewer 与渲染器', () => {
    it('应使用主题颜色渲染标题', () => {
      const theme = Themes.dark;
      // 手动调用 BlockNodeRenderer 渲染标题节点
      const node = {
        type: NodeType.Header,
        level: 1,
        children: [{ type: NodeType.Text, content: 'Title' }],
      };
      const result = BlockNodeRenderer({ node, theme }) as any;

      // 结构：Padding -> Text
      const text = result.props.children;
      expect(text.props.color).toBe(theme.text.primary);
    });

    it('应使用主题背景渲染代码块', () => {
      const theme = Themes.dark;
      const node = { type: NodeType.CodeBlock, content: 'code', language: 'js' };
      const result = BlockNodeRenderer({ node, theme }) as any;

      // 结构：Container -> Padding -> Highlighter
      expect(result.props.color).toBe(theme.component.headerBg);
    });
  });
});
