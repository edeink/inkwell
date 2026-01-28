/** @jsxImportSource @/utils/compiler */
/**
 * MarkdownPreview 相关单元测试。
 *
 * 覆盖范围：
 * - MarkdownParser 的块级与行内语法解析。
 * - BlockNodeRenderer 的渲染稳定性（含 key 透传与重建顺序）。
 * - 文字样式相关的渲染调用契约（字号/斜体/下划线等）。
 */
import { describe, expect, it, vi } from 'vitest';

import { BlockNodeRenderer } from '../block-renderers';
import { defaultMarkdownRenderStyle } from '../block-renderers/types';
import { hasFrontMatter } from '../front-matter/has-front-matter';
import { MarkdownParser, NodeType } from '../parser';

import type { ComponentType } from '@/core/type';

import { Text } from '@/core';
import { WidgetRegistry } from '@/core/registry';
import { StatefulWidget } from '@/core/state/stateful';
import { Canvas2DRenderer } from '@/renderer/canvas2d/canvas-2d-renderer';
import Runtime from '@/runtime';
import { Themes, type ThemePalette } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';

import '@/core/registry';

describe('MarkdownParser', () => {
  const parser = new MarkdownParser();

  it('应该正确解析标题', () => {
    const text = '# H1 Title\n## H2 Title';
    const ast = parser.parse(text);

    expect(ast.children).toHaveLength(2);
    expect(ast.children![0].type).toBe(NodeType.Header);
    expect(ast.children![0].level).toBe(1);
    expect(ast.children![0].children![0].content).toBe('H1 Title');

    expect(ast.children![1].type).toBe(NodeType.Header);
    expect(ast.children![1].level).toBe(2);
  });

  it('应该正确解析代码块', () => {
    const text = '```ts\nconsole.log("hello")\n```';
    const ast = parser.parse(text);

    expect(ast.children).toHaveLength(1);
    expect(ast.children![0].type).toBe(NodeType.CodeBlock);
    expect(ast.children![0].language).toBe('ts');
    expect(ast.children![0].content).toContain('console.log("hello")');
  });

  it('应该正确解析列表', () => {
    const text = '* Item 1\n* Item 2';
    const ast = parser.parse(text);

    expect(ast.children).toHaveLength(1);
    expect(ast.children![0].type).toBe(NodeType.List);
    expect(ast.children![0].children).toHaveLength(2);
    expect(ast.children![0].children![0].type).toBe(NodeType.ListItem);
  });

  it('应该正确解析嵌套列表', () => {
    const text = ['- A', '  - B', '  - C', '- D'].join('\n');
    const ast = parser.parse(text);

    expect(ast.children).toHaveLength(1);
    const rootList = ast.children![0];
    expect(rootList.type).toBe(NodeType.List);
    expect(rootList.children).toHaveLength(2);

    const firstItem = rootList.children![0];
    expect(firstItem.type).toBe(NodeType.ListItem);
    const nested = (firstItem.children ?? []).find((n) => n.type === NodeType.List);
    expect(nested).toBeTruthy();
    expect(nested!.children).toHaveLength(2);
  });

  it('应该正确解析行内样式', () => {
    const text = 'Hello **Bold** and *Italic*';
    const ast = parser.parse(text);

    const paragraph = ast.children![0];
    expect(paragraph.type).toBe(NodeType.Paragraph);

    const inlineNodes = paragraph.children!;
    expect(inlineNodes.some((n) => n.type === NodeType.Bold && n.content === 'Bold')).toBe(true);
    expect(inlineNodes.some((n) => n.type === NodeType.Italic && n.content === 'Italic')).toBe(
      true,
    );
    const plain = inlineNodes
      .map((n) => (n.type === NodeType.Text ? n.content || '' : n.content || ''))
      .join('');
    expect(plain).toBe('Hello Bold and Italic');
  });

  it('应该正确解析链接', () => {
    const text = '[Google](https://google.com)';
    const ast = parser.parse(text);

    const link = ast.children![0].children![0];
    expect(link.type).toBe(NodeType.Link);
    expect(link.href).toBe('https://google.com');
    expect(link.children![0].content).toBe('Google');
  });

  it('应该正确解析有序列表', () => {
    const text = '1. Item 1\n2. Item 2';
    const ast = parser.parse(text);

    expect(ast.children).toHaveLength(1);
    expect(ast.children![0].type).toBe(NodeType.OrderedList);
    expect(ast.children![0].children).toHaveLength(2);
  });

  it('应该正确解析任务列表', () => {
    const text = '- [ ] Task 1\n- [x] Task 2';
    const ast = parser.parse(text);

    expect(ast.children).toHaveLength(1);
    expect(ast.children![0].type).toBe(NodeType.TaskList);
    const items = ast.children![0].children!;
    expect(items).toHaveLength(2);
    expect(items[0].checked).toBe(false);
    expect(items[1].checked).toBe(true);
  });

  it('应该正确解析图片', () => {
    const text = '![Alt](https://image.com)';
    const ast = parser.parse(text);

    const image = ast.children![0].children![0];
    expect(image.type).toBe(NodeType.Image);
    expect(image.alt).toBe('Alt');
    expect(image.href).toBe('https://image.com');
  });

  it('应该正确解析表格', () => {
    const text = '| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |';
    const ast = parser.parse(text);

    const table = ast.children![0];
    expect(table.type).toBe(NodeType.Table);
    expect(table.children).toHaveLength(2);
    expect(table.children![0].type).toBe(NodeType.TableRow);
    expect(table.children![0].children![0].isHeader).toBe(true);
    expect(table.children![1].children![0].isHeader).toBe(false);
  });

  it('应该正确解析分割线', () => {
    const text = '---';
    const ast = parser.parse(text);
    expect(ast.children![0].type).toBe(NodeType.HorizontalRule);
  });
});

describe('FrontMatter', () => {
  it('hasFrontMatter 在空数据时应返回 false', () => {
    expect(hasFrontMatter({})).toBe(false);
    expect(hasFrontMatter({ categories: [] })).toBe(false);
  });

  it('hasFrontMatter 在任意字段存在时应返回 true', () => {
    expect(hasFrontMatter({ title: 'T' })).toBe(true);
    expect(hasFrontMatter({ date: '2026-01-01' })).toBe(true);
    expect(hasFrontMatter({ link: 'https://example.com' })).toBe(true);
    expect(hasFrontMatter({ categories: ['a'] })).toBe(true);
  });
});

describe('MarkdownPreview 渲染稳定性', () => {
  const asType = (type: string) => type as unknown as ComponentType;

  const sampleMarkdown = [
    '# Markdown 语法覆盖示例',
    '',
    '这是一段普通文本，包含 **加粗**、*斜体*、以及行内代码：`const a = 1;`。',
    '',
    '## 链接与图片',
    '',
    '[访问 Google](https://google.com)',
    '',
    '![Inkwell Logo](https://via.placeholder.com/150)',
    '',
    '## 表格',
    '',
    '| 表头 1 | 表头 2 |',
    '| ------ | ------ |',
    '| 单元格 1 | 单元格 2 |',
    '| 单元格 3 | 单元格 4 |',
    '',
    '结束',
  ].join('\n');

  it('BlockNodeRenderer 应将 key 透传到根节点（含表格）', () => {
    const parser = new MarkdownParser();
    const ast = parser.parse(sampleMarkdown);
    const nodes = ast.children ?? [];
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.some((n) => n.type === NodeType.Table)).toBe(true);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const el = BlockNodeRenderer({ node, theme: Themes.light, key: String(i) });
      const data = compileElement(el as any);
      expect(data.key).toBe(String(i));
    }
  });

  it('嵌套列表（depth>0）不应带有列表块底部间距', () => {
    const parser = new MarkdownParser();
    const cases = [
      {
        md: ['- A', '- B'].join('\n'),
        type: NodeType.List,
        marginBottom: defaultMarkdownRenderStyle.list.marginBottom,
      },
      {
        md: ['1. A', '2. B'].join('\n'),
        type: NodeType.OrderedList,
        marginBottom: defaultMarkdownRenderStyle.orderedList.marginBottom,
      },
      {
        md: ['- [ ] A', '- [x] B'].join('\n'),
        type: NodeType.TaskList,
        marginBottom: defaultMarkdownRenderStyle.taskList.marginBottom,
      },
    ];

    for (const c of cases) {
      const ast = parser.parse(c.md);
      const node = ast.children?.[0];
      expect(node?.type).toBe(c.type);

      const topData = compileElement(
        BlockNodeRenderer({ node: node!, theme: Themes.light, depth: 0, key: 'top' }) as any,
      ) as any;
      const top = WidgetRegistry.createWidget(topData)!;
      top.createElement(topData);
      expect(top.type).toBe('Padding');
      expect((top as any).padding.bottom).toBe(c.marginBottom);

      const nestedData = compileElement(
        BlockNodeRenderer({ node: node!, theme: Themes.light, depth: 1, key: 'nested' }) as any,
      ) as any;
      const nested = WidgetRegistry.createWidget(nestedData)!;
      nested.createElement(nestedData);
      expect(nested.type).toBe('Padding');
      expect((nested as any).padding.bottom).toBe(0);
    }
  });

  it('嵌套列表应与父级条目内容保持一致的分隔间距', () => {
    const parser = new MarkdownParser();
    const cases = [
      {
        md: ['- A', '  - B'].join('\n'),
        type: NodeType.List,
        itemSpacing: defaultMarkdownRenderStyle.list.columnSpacing,
      },
      {
        md: ['1. A', '  1. B'].join('\n'),
        type: NodeType.OrderedList,
        itemSpacing: defaultMarkdownRenderStyle.orderedList.columnSpacing,
      },
      {
        md: ['- [ ] A', '  - [ ] B'].join('\n'),
        type: NodeType.TaskList,
        itemSpacing: defaultMarkdownRenderStyle.taskList.columnSpacing,
      },
    ];

    for (const c of cases) {
      const ast = parser.parse(c.md);
      const node = ast.children?.[0];
      expect(node?.type).toBe(c.type);

      const rootData = compileElement(
        BlockNodeRenderer({ node: node!, theme: Themes.light, depth: 0, key: 'root' }) as any,
      ) as any;
      const root = WidgetRegistry.createWidget(rootData)!;
      root.createElement(rootData);
      expect(root.type).toBe('Padding');

      const listColumn = root.children?.[0] as any;
      expect(listColumn?.type).toBe('Column');

      const firstItem = listColumn.children?.[0] as any;
      expect(firstItem?.type).toBe('Column');
      expect(firstItem.spacing).toBe(c.itemSpacing);
      expect(firstItem.children?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('重建时子节点顺序应保持一致，表格不应置顶', async () => {
    class TestMarkdownHost extends StatefulWidget<{
      width: number;
      height: number;
      content: string;
      theme: ThemePalette;
    }> {
      state = { tick: 0 };

      bump() {
        this.setState({ tick: this.state.tick + 1 });
      }

      render() {
        const props = this.props as unknown as {
          width: number;
          height: number;
          content: string;
          theme: ThemePalette;
        };
        const parser = new MarkdownParser();
        const ast = parser.parse(props.content);
        const nodes = ast.children ?? [];
        const children = nodes.map((node, index) =>
          compileElement(
            BlockNodeRenderer({ node, theme: props.theme, key: String(index) }) as any,
          ),
        );
        return {
          type: asType('Column'),
          props: {
            width: props.width,
            height: props.height,
            children,
          },
        };
      }
    }

    const containerId = 'md-order-test';
    document.body.innerHTML = `<div id="${containerId}" />`;

    const runtime = await Runtime.create(containerId);
    const el = {
      type: TestMarkdownHost,
      key: 'root',
      props: {
        width: 800,
        height: 600,
        content: sampleMarkdown,
        theme: Themes.light,
      },
    } as any;

    await runtime.render(el);

    const host = runtime.getRootWidget() as unknown as TestMarkdownHost;
    const column = host.children[0] as unknown as { children: { key: string }[] };

    const parser = new MarkdownParser();
    const ast = parser.parse(sampleMarkdown);
    const tableIndex = (ast.children ?? []).findIndex((n) => n.type === NodeType.Table);
    expect(tableIndex).toBeGreaterThan(-1);

    expect(column.children.map((c) => c.key)).toEqual(
      (ast.children ?? []).map((_, index) => String(index)),
    );

    host.bump();
    await new Promise((r) => setTimeout(r, 20));

    const root2 = runtime.getRootWidget() as unknown as TestMarkdownHost;
    const column2 = root2.children[0] as unknown as { children: { key: string }[] };

    const keys2 = column2.children.map((c) => c.key);
    expect(keys2).toEqual((ast.children ?? []).map((_, index) => String(index)));
    expect(keys2[0]).not.toBe(String(tableIndex));

    runtime.destroy();
  });
});

describe('文字样式渲染调用', () => {
  it('Text 应将 fontStyle 与 textDecoration 透传给 renderer.drawText', () => {
    const drawText = vi.fn();
    const renderer = { drawText } as any;

    const data = compileElement(
      <Text
        key="t"
        text="你好"
        fontSize={14}
        fontWeight="bold"
        fontStyle="italic"
        textDecoration={['underline', 'line-through']}
        color="#111111"
      />,
    ) as any;
    const widget = WidgetRegistry.createWidget(data)! as unknown as Text;
    widget.createElement(data);

    (widget as any).renderObject = { size: { width: 100, height: 24 } };
    (widget as any).textMetrics = {
      width: 20,
      height: 24,
      lines: ['你好'],
      lineWidths: [20],
      lineIndices: [{ start: 0, end: 2 }],
      ascent: 10,
      descent: 2,
    };

    (widget as any).paintSelf({ renderer } as any);

    expect(drawText).toHaveBeenCalledTimes(1);
    const arg = drawText.mock.calls[0][0];
    expect(arg.fontStyle).toBe('italic');
    expect(arg.fontWeight).toBe('bold');
    expect(arg.textDecoration).toEqual(['underline', 'line-through']);
    expect(arg.fontSize).toBe(14);
  });

  it('Text 行内渲染应拆分长文本以避免错误折行', () => {
    const parser = new MarkdownParser();
    const nodes = parser.parseInline('完成各阶段 Schema 转换；建设模板上传与生产闭环');
    const textNodes = nodes.filter((n) => n.type === NodeType.Text);
    expect(textNodes.length).toBeGreaterThan(1);
  });

  it('Canvas2DRenderer.drawText 默认字号应为 14px', () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({
        width: 10,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
      })),
      font: '',
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      textAlign: 'left',
      textBaseline: 'top',
      canvas: document.createElement('canvas'),
    } as any;

    const renderer = new Canvas2DRenderer();
    const restore = renderer.setContext(ctx);
    renderer.drawText({ text: 'a', x: 0, y: 0 });
    restore();

    expect(ctx.font).toContain('14px');
  });

  it('Canvas2DRenderer.drawText 应把斜体样式写入 ctx.font', () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({
        width: 10,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
      })),
      font: '',
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      textAlign: 'left',
      textBaseline: 'top',
      canvas: document.createElement('canvas'),
    } as any;

    const renderer = new Canvas2DRenderer();
    const restore = renderer.setContext(ctx);
    renderer.drawText({
      text: 'a',
      x: 0,
      y: 0,
      fontStyle: 'italic',
      fontWeight: 'bold',
      fontSize: 14,
    });
    restore();

    expect(ctx.font.startsWith('italic bold 14px')).toBe(true);
  });

  it('Canvas2DRenderer.drawText 传入下划线时应绘制装饰线', () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({
        width: 10,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
      })),
      font: '',
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      textAlign: 'left',
      textBaseline: 'top',
      canvas: document.createElement('canvas'),
    } as any;

    const renderer = new Canvas2DRenderer();
    const restore = renderer.setContext(ctx);
    renderer.drawText({ text: 'a', x: 0, y: 0, fontSize: 14, textDecoration: ['underline'] });
    restore();

    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
  });
});
