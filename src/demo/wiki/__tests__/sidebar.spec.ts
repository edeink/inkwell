import { describe, expect, it } from 'vitest';

import { runApp } from '../app';
import {
  createWikiDocLoader,
  flattenSidebarToDocIds,
  parseMarkdownFrontMatter,
} from '../helpers/wiki-doc';
import sidebars from '../raw/sidebar';
import { BlockNodeRenderer } from '../widgets/markdown-preview/block-renderers';
import { MarkdownParser, NodeType } from '../widgets/markdown-preview/parser';

import { Themes } from '@/styles/theme';

describe('Wiki Demo sidebar 配置', () => {
  it('应从 sidebar 配置解析出文档 id 列表', () => {
    const modules = import.meta.glob('../raw/**/*.markdown', { query: '?raw', import: 'default' });
    const ids = flattenSidebarToDocIds((sidebars as any).docs, modules);
    expect(ids).toEqual(['intro', 'guide/getting-started', 'guide/layout', 'sample', 'sum-2025']);
  });

  it('应能按需加载指定文档内容', async () => {
    const modules = import.meta.glob('../raw/**/*.markdown', { query: '?raw', import: 'default' });
    const loadDoc = createWikiDocLoader(modules as any);
    const doc = await loadDoc('intro');
    expect(doc.content.length).toBeGreaterThan(0);
  });

  it('当文档不存在时应返回空内容', async () => {
    const modules = import.meta.glob('../raw/**/*.markdown', { query: '?raw', import: 'default' });
    const loadDoc = createWikiDocLoader(modules as any);
    const doc = await loadDoc('not-exist');
    expect(doc.content).toBe('');
  });
});

describe('Wiki Demo front matter 与 link 参数', () => {
  it('应解析 title/link/date/categories 并剥离正文', () => {
    const input = [
      '---',
      "title: '标题'",
      'link: my_link',
      'date: 2024-12-31',
      'categories: [a, b]',
      '---',
      '',
      '# 正文',
    ].join('\n');
    const parsed = parseMarkdownFrontMatter(input);
    expect(parsed.frontMatter).toEqual({
      title: '标题',
      link: 'my_link',
      date: '2024-12-31',
      categories: ['a', 'b'],
    });
    expect(parsed.body.trim()).toBe('# 正文');
  });

  it('当正文开头有 BOM 时应剥离 BOM', () => {
    const input = '\uFEFF# 标题';
    const parsed = parseMarkdownFrontMatter(input);
    expect(parsed.body).toBe('# 标题');
  });

  it('categories 为单值时应转为数组', () => {
    const input = ['---', 'categories: life', '---', '正文'].join('\n');
    const parsed = parseMarkdownFrontMatter(input);
    expect(parsed.frontMatter.categories).toEqual(['life']);
    expect(parsed.body.trim()).toBe('正文');
  });

  it('categories 为列表且含引号时应剥离引号', () => {
    const input = ['---', `categories: ['a', "b", c]`, '---', '正文'].join('\n');
    const parsed = parseMarkdownFrontMatter(input);
    expect(parsed.frontMatter.categories).toEqual(['a', 'b', 'c']);
    expect(parsed.body.trim()).toBe('正文');
  });

  it('刷新时应根据 link 参数选中对应文档', () => {
    window.history.replaceState(null, '', '/?tab=wiki&link=thought_in_2024');
    let rendered: any = null;
    const runtime = { render: (el: any) => (rendered = el) } as any;
    runApp(runtime, 800, 600, Themes.light);
    expect(rendered?.props?.initialSelectedKey).toBe('sum-2025');
  });
});

describe('Wiki Demo Markdown 解析与渲染', () => {
  it('应识别表格、分割线、引用与代码块', () => {
    const md = [
      '> 引用第一行',
      '> 引用第二行',
      '',
      '```javascript',
      'const a = 1;',
      '```',
      '',
      '| 表头 1 | 表头 2 |',
      '| ------ | ------ |',
      '| 单元格 1 | 单元格 2 |',
      '',
      '---',
    ].join('\n');
    const parser = new MarkdownParser();
    const ast = parser.parse(md);
    const types = (ast.children || []).map((n) => n.type);
    expect(types).toContain(NodeType.Quote);
    expect(types).toContain(NodeType.CodeBlock);
    expect(types).toContain(NodeType.Table);
    expect(types).toContain(NodeType.HorizontalRule);
  });

  it('渲染表格、分割线、引用与代码块时应返回有效元素', () => {
    const parser = new MarkdownParser();
    const ast = parser.parse(
      [
        '> 引用',
        '',
        '```javascript',
        'const a = 1;',
        '```',
        '',
        '| A | B |',
        '| - | - |',
        '| 1 | 2 |',
        '',
        '---',
      ].join('\n'),
    );
    const nodes = ast.children || [];
    for (const node of nodes) {
      if (
        node.type !== NodeType.Quote &&
        node.type !== NodeType.CodeBlock &&
        node.type !== NodeType.Table &&
        node.type !== NodeType.HorizontalRule
      ) {
        continue;
      }
      const el = BlockNodeRenderer({ node, theme: Themes.light });
      expect(el).toBeTruthy();
      expect((el as any).type).toBeTruthy();
      expect((el as any).props).toBeTruthy();
    }
  });
});
