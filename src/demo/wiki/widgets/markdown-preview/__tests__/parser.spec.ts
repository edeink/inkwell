import { describe, expect, it } from 'vitest';

import { MarkdownParser, NodeType } from '../parser';

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
