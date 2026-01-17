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
import { MarkdownParser, NodeType } from '../parser';

import type { ComponentType } from '@/core/type';

import { Text } from '@/core';
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

  it('应该正确解析行内样式', () => {
    const text = 'Hello **Bold** and *Italic*';
    const ast = parser.parse(text);

    const paragraph = ast.children![0];
    expect(paragraph.type).toBe(NodeType.Paragraph);

    const inlineNodes = paragraph.children!;
    expect(inlineNodes).toHaveLength(4);

    expect(inlineNodes[0].content).toBe('Hello ');
    expect(inlineNodes[1].type).toBe(NodeType.Bold);
    expect(inlineNodes[1].content).toBe('Bold');
    expect(inlineNodes[3].type).toBe(NodeType.Italic);
    expect(inlineNodes[3].content).toBe('Italic');
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

    const widget = new Text({
      type: 'Text',
      text: '你好',
      fontSize: 14,
      fontWeight: 'bold',
      fontStyle: 'italic',
      textDecoration: ['underline', 'line-through'],
      color: '#111111',
    });

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
