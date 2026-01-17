/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { BlockNodeRenderer } from '../block-renderers';
import { MarkdownParser, NodeType } from '../parser';

import type { WidgetProps } from '@/core/type';

import { Column, Container, Expanded, Padding, Row, ScrollView, Text, Wrap } from '@/core';
import { createTightConstraints } from '@/core/base';
import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from '@/core/flex/type';
import { WidgetRegistry } from '@/core/registry';
import { Themes } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';

import '@/core/registry';

function ensureCoreTypesRegistered() {
  WidgetRegistry.registerType('ScrollView', ScrollView);
  WidgetRegistry.registerType('Column', Column);
  WidgetRegistry.registerType('Row', Row);
  WidgetRegistry.registerType('Container', Container);
  WidgetRegistry.registerType('Padding', Padding);
  WidgetRegistry.registerType('Expanded', Expanded);
  WidgetRegistry.registerType('Text', Text);
  WidgetRegistry.registerType('Wrap', Wrap);
}

describe('MarkdownPreview 顺序问题回归', () => {
  it('parser 应保持 quote 在 table 之前', () => {
    const md = [
      '> 这是一段引用。',
      '> 第二行',
      '',
      '| 表头 1 | 表头 2 |',
      '| --- | --- |',
      '| 单元格 1 | 单元格 2 |',
    ].join('\n');
    const parser = new MarkdownParser();
    const ast = parser.parse(md);
    expect((ast.children ?? []).map((n) => n.type)).toEqual([NodeType.Quote, NodeType.Table]);
  });

  it('包含标题时应保持 quote 在 table 之前', () => {
    const md = [
      '## 引用',
      '',
      '> 这是一段引用。',
      '',
      '## 表格',
      '',
      '| 表头 1 | 表头 2 |',
      '| --- | --- |',
      '| 单元格 1 | 单元格 2 |',
    ].join('\n');
    const parser = new MarkdownParser();
    const ast = parser.parse(md);
    expect((ast.children ?? []).map((n) => n.type)).toEqual([
      NodeType.Header,
      NodeType.Quote,
      NodeType.Header,
      NodeType.Table,
    ]);
  });

  it('ScrollView 的无界约束下不应发生 quote/table 重叠或反序', () => {
    ensureCoreTypesRegistered();
    const md = [
      '> 这是一段引用。',
      '> 第二行',
      '',
      '| 表头 1 | 表头 2 |',
      '| --- | --- |',
      '| 单元格 1 | 单元格 2 |',
    ].join('\n');

    const parser = new MarkdownParser();
    const ast = parser.parse(md);
    const nodes = ast.children ?? [];

    const columnData: WidgetProps = {
      type: 'Column',
      crossAxisAlignment: CrossAxisAlignment.Start,
      mainAxisAlignment: MainAxisAlignment.Start,
      mainAxisSize: MainAxisSize.Min,
      children: nodes.map((node, index) =>
        compileElement(BlockNodeRenderer({ node, theme: Themes.light, key: String(index) }) as any),
      ),
    };

    const scrollViewData: WidgetProps = {
      type: 'ScrollView',
      children: [columnData],
    };

    const scrollView = WidgetRegistry.createWidget(scrollViewData)!;
    scrollView.createElement(scrollViewData);
    scrollView.layout(createTightConstraints(800, 600));

    const column = scrollView.children[0];
    expect(column.type).toBe('Column');
    expect(column.children).toHaveLength(2);

    const quote = column.children[0];
    const table = column.children[1];

    expect(quote.key).toBe('0');
    expect(table.key).toBe('1');

    const quoteTop = quote.renderObject.offset.dy;
    const tableTop = table.renderObject.offset.dy;
    expect(tableTop).toBeGreaterThanOrEqual(quoteTop);

    const quoteBottom = quoteTop + quote.renderObject.size.height;
    expect(tableTop).toBeGreaterThanOrEqual(quoteBottom);

    scrollView.dispose();
  });

  it('包含标题时不应发生 quote/table 重叠或反序', () => {
    ensureCoreTypesRegistered();
    const md = [
      '## 引用',
      '',
      '> 这是一段引用。',
      '',
      '## 表格',
      '',
      '| 表头 1 | 表头 2 |',
      '| --- | --- |',
      '| 单元格 1 | 单元格 2 |',
      '| 单元格 3 | 单元格 4 |',
    ].join('\n');

    const parser = new MarkdownParser();
    const ast = parser.parse(md);
    const nodes = ast.children ?? [];

    const columnData: WidgetProps = {
      type: 'Column',
      crossAxisAlignment: CrossAxisAlignment.Start,
      mainAxisAlignment: MainAxisAlignment.Start,
      mainAxisSize: MainAxisSize.Min,
      children: nodes.map((node, index) =>
        compileElement(BlockNodeRenderer({ node, theme: Themes.light, key: String(index) }) as any),
      ),
    };

    const scrollViewData: WidgetProps = {
      type: 'ScrollView',
      children: [columnData],
    };

    const scrollView = WidgetRegistry.createWidget(scrollViewData)!;
    scrollView.createElement(scrollViewData);
    scrollView.layout(createTightConstraints(800, 600));

    const column = scrollView.children[0];
    expect(column.type).toBe('Column');
    expect(column.children.length).toBeGreaterThanOrEqual(4);

    const quote = column.children[1];
    const table = column.children[3];
    expect(quote.key).toBe('1');
    expect(table.key).toBe('3');

    const quoteTop = quote.renderObject.offset.dy;
    const tableTop = table.renderObject.offset.dy;
    const quoteBottom = quoteTop + quote.renderObject.size.height;
    expect(tableTop).toBeGreaterThanOrEqual(quoteBottom);

    scrollView.dispose();
  });
});

describe('Widget.buildChildren 顺序处理', () => {
  it('应按 childrenData 顺序复用并重排子节点', () => {
    class Host extends Column {
      public exposeBuild(childrenData: WidgetProps[]) {
        this.buildChildren(childrenData);
      }
    }

    const host = new Host({ type: 'Column', key: 'host' } as any);
    host.createElement({ type: 'Column', key: 'host', children: [] } as any);

    const a = { type: 'Container', key: 'a' } as any;
    const b = { type: 'Container', key: 'b' } as any;
    const c = { type: 'Container', key: 'c' } as any;

    host.exposeBuild([a, b, c]);
    expect(host.children.map((w) => w.key)).toEqual(['a', 'b', 'c']);

    host.exposeBuild([b, a, c]);
    expect(host.children.map((w) => w.key)).toEqual(['b', 'a', 'c']);
  });
});
