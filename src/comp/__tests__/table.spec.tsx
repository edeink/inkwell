/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Table, type TableColumn } from '../table';
import { getDefaultTokens } from '../theme';

import { Container } from '@/core';
import { createBoxConstraints } from '@/core/base';
import { findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

type RowData = {
  key: string;
  name: string;
  city: string;
};

function buildColumns(): ReadonlyArray<TableColumn<RowData>> {
  return [
    { title: '姓名', key: 'name', dataIndex: 'name', width: 120, fixed: 'left' },
    { title: '城市', key: 'city', dataIndex: 'city', width: 220 },
    { title: '操作', key: 'action', width: 120, fixed: 'right', render: () => '查看' },
  ];
}

function buildFitColumns(): ReadonlyArray<TableColumn<RowData>> {
  return [
    { title: '姓名', key: 'name', dataIndex: 'name', width: 120, fixed: 'left' },
    { title: '城市', key: 'city', dataIndex: 'city', width: 160 },
    { title: '操作', key: 'action', width: 120, fixed: 'right', render: () => '查看' },
  ];
}

function buildOverflowColumns(count: number): ReadonlyArray<TableColumn<RowData>> {
  const cols: TableColumn<RowData>[] = [
    { title: '姓名', key: 'name', dataIndex: 'name', width: 120, fixed: 'left' },
  ];
  for (let i = 0; i < count; i++) {
    cols.push({ title: `列${i + 1}`, key: `c${i + 1}`, width: 200, dataIndex: 'city' });
  }
  cols.push({ title: '操作', key: 'action', width: 120, fixed: 'right', render: () => '查看' });
  return cols;
}

function buildData(): ReadonlyArray<RowData> {
  return [
    { key: '1', name: '张三', city: '北京' },
    { key: '2', name: '李四', city: '上海' },
    { key: '3', name: '王五', city: '深圳' },
  ];
}

describe('Table Header 布局', () => {
  it('未设置 height 时 Header 高度应保持行高，且 Body 不应是纵向 ScrollView', () => {
    const el = (
      <Container key="root" width={400} height={200}>
        <Table key="tbl" width={400} columns={buildColumns()} dataSource={buildData()} />
      </Container>
    );

    const json = compileElement(el as any);
    const root = WidgetRegistry.createWidget(json)!;
    root.createElement(json);
    root.layout(createBoxConstraints({ maxWidth: 1000, maxHeight: 1000 }));

    const tokens = getDefaultTokens();
    const rowH = tokens.controlHeight.middle;

    const header = findWidget(root, 'Row#tbl-thead') as any;
    expect(header).toBeTruthy();
    expect(header.renderObject.size.height).toBe(rowH);

    const table = findWidget(root, 'Table#tbl') as any;
    expect(table).toBeTruthy();

    const tableRoot = table.children?.[0] as any;
    const column = tableRoot?.children?.[0] as any;
    expect(column?.type).toBe('Column');

    const body = column.children?.[1] as any;
    expect(body?.type).toBe('Row');
  });

  it('设置 height 时仅 Body 纵向滚动，Header 不应占满父容器高度', () => {
    const tokens = getDefaultTokens();
    const rowH = tokens.controlHeight.middle;

    const el = (
      <Container key="root2" width={400} height={200}>
        <Table
          key="tbl2"
          width={400}
          height={200}
          columns={buildColumns()}
          dataSource={buildData()}
        />
      </Container>
    );

    const json = compileElement(el as any);
    const root = WidgetRegistry.createWidget(json)!;
    root.createElement(json);
    root.layout(createBoxConstraints({ maxWidth: 1000, maxHeight: 1000 }));

    const header = findWidget(root, 'Row#tbl2-thead') as any;
    expect(header).toBeTruthy();
    expect(header.renderObject.size.height).toBe(rowH);

    const table = findWidget(root, 'Table#tbl2') as any;
    expect(table).toBeTruthy();
    const tableRoot = table.children?.[0] as any;
    const column = tableRoot?.children?.[0] as any;
    expect(column?.type).toBe('Column');

    const bodyWrapper = column.children?.[1] as any;
    expect(bodyWrapper?.type).toBe('Container');

    const bodyScrollView = bodyWrapper.children?.[0] as any;
    expect(bodyScrollView?.type).toBe('ScrollView');
    expect(bodyScrollView.renderObject.size.height).toBe(200 - rowH);

    const headerInsideBody = findWidget(bodyScrollView, '#tbl2-thead') as any;
    expect(headerInsideBody).toBeNull();
  });

  it('固定列宽度总和超过 Table 宽度时应自动缩放，避免溢出外层宽度', () => {
    const el = (
      <Container key="root3" width={400} height={200}>
        <Table
          key="tbl3"
          width={400}
          height={200}
          columns={[
            { title: '左', key: 'left', width: 300, fixed: 'left' },
            { title: '中', key: 'mid', width: 200 },
            { title: '右', key: 'right', width: 300, fixed: 'right' },
          ]}
          dataSource={buildData()}
        />
      </Container>
    );

    const json = compileElement(el as any);
    const root = WidgetRegistry.createWidget(json)!;
    root.createElement(json);
    root.layout(createBoxConstraints({ maxWidth: 1000, maxHeight: 1000 }));

    const header = findWidget(root, 'Row#tbl3-thead') as any;
    expect(header).toBeTruthy();

    const leftHeader = findWidget(root, 'Container#th-left') as any;
    const rightHeader = findWidget(root, 'Container#th-right') as any;
    expect(leftHeader).toBeTruthy();
    expect(rightHeader).toBeTruthy();
    expect(leftHeader.renderObject.size.width).toBeCloseTo(200, 6);
    expect(rightHeader.renderObject.size.width).toBeCloseTo(200, 6);

    const sum = (header.children ?? []).reduce(
      (acc: number, w: any) => acc + (w?.renderObject?.size?.width ?? 0),
      0,
    );
    expect(sum).toBeCloseTo(400, 6);
  });
});

describe('Table 宽高、滚动与悬停层叠', () => {
  it('不同容器宽度下 Table 渲染宽度应严格等于可用宽度', () => {
    const widths = [320, 768, 1024] as const;
    for (const w of widths) {
      const el = (
        <Table key={`tbl-w-${w}`} columns={buildOverflowColumns(6)} dataSource={buildData()} />
      );
      const json = compileElement(el as any);
      const table = WidgetRegistry.createWidget(json)!;
      table.createElement(json);
      table.layout(createBoxConstraints({ maxWidth: w, maxHeight: 200 }));
      expect(table.renderObject.size.width).toBe(w);

      const tableRoot = findWidget(table, `Container#tbl-w-${w}-root`) as any;
      expect(tableRoot).toBeTruthy();
      expect(tableRoot.renderObject.size.width).toBe(w);
    }
  });

  it('不同容器宽度下内容未溢出时不应强制展示水平滚动条（少量数据）', () => {
    const widths = [320, 768, 1024] as const;
    for (const w of widths) {
      const el = (
        <Table key={`tbl-fit-w-${w}`} columns={buildFitColumns()} dataSource={buildData()} />
      );
      const json = compileElement(el as any);
      const table = WidgetRegistry.createWidget(json)!;
      table.createElement(json);
      table.layout(createBoxConstraints({ maxWidth: w, maxHeight: 200 }));

      const bodyScrollX = findWidget(table, `ScrollView#tbl-fit-w-${w}-tbody-scroll-x`) as any;
      expect(bodyScrollX).toBeTruthy();
      expect((bodyScrollX as any)._contentSize.width).toBeLessThanOrEqual(
        (bodyScrollX as any)._width,
      );
      expect((bodyScrollX as any)._scrollBarX.renderObject.size.width).toBe(0);

      const headScrollX = findWidget(table, `ScrollView#tbl-fit-w-${w}-thead-scroll-x`) as any;
      expect(headScrollX).toBeTruthy();
      expect((headScrollX as any)._contentSize.width).toBeLessThanOrEqual(
        (headScrollX as any)._width,
      );
      expect((headScrollX as any)._scrollBarX.renderObject.size.width).toBe(0);
    }
  });

  it('内容宽度未超过容器宽度时不应强制展示水平滚动条', () => {
    const el = (
      <Table
        key="tbl-fit"
        width={400}
        height={200}
        columns={buildFitColumns()}
        dataSource={buildData()}
      />
    );
    const json = compileElement(el as any);
    const table = WidgetRegistry.createWidget(json)!;
    table.createElement(json);
    table.layout(createBoxConstraints({ maxWidth: 400, maxHeight: 200 }));

    const bodyScrollX = findWidget(table, 'ScrollView#tbl-fit-tbody-scroll-x') as any;
    expect(bodyScrollX).toBeTruthy();
    expect((bodyScrollX as any)._contentSize.width).toBeLessThanOrEqual(
      (bodyScrollX as any)._width,
    );
    expect((bodyScrollX as any)._scrollBarX.renderObject.size.width).toBe(0);

    const headScrollX = findWidget(table, 'ScrollView#tbl-fit-thead-scroll-x') as any;
    expect(headScrollX).toBeTruthy();
    expect((headScrollX as any)._contentSize.width).toBeLessThanOrEqual(
      (headScrollX as any)._width,
    );
    expect((headScrollX as any)._scrollBarX.renderObject.size.width).toBe(0);
  });

  it('内容宽度超过容器宽度时应展示水平滚动条，且不破坏布局', () => {
    const el = (
      <Table
        key="tbl-overflow"
        width={400}
        height={200}
        columns={buildOverflowColumns(8)}
        dataSource={buildData()}
      />
    );
    const json = compileElement(el as any);
    const table = WidgetRegistry.createWidget(json)!;
    table.createElement(json);
    table.layout(createBoxConstraints({ maxWidth: 400, maxHeight: 200 }));

    const bodyScrollX = findWidget(table, 'ScrollView#tbl-overflow-tbody-scroll-x') as any;
    expect(bodyScrollX).toBeTruthy();
    expect((bodyScrollX as any)._contentSize.width).toBeGreaterThan((bodyScrollX as any)._width);
    expect((bodyScrollX as any)._scrollBarX.renderObject.size.width).toBeGreaterThan(0);

    const headScrollX = findWidget(table, 'ScrollView#tbl-overflow-thead-scroll-x') as any;
    expect(headScrollX).toBeTruthy();
    expect((headScrollX as any)._contentSize.width).toBeGreaterThan((headScrollX as any)._width);

    const tableRoot = findWidget(table, 'Container#tbl-overflow-root') as any;
    expect(tableRoot).toBeTruthy();
    expect(tableRoot.renderObject.size.width).toBe(400);
  });

  it('父容器给出固定高度时 Table 最小高度不应小于该高度（空数据）', () => {
    const tokens = getDefaultTokens();
    const rowH = tokens.controlHeight.middle;

    const el = (
      <Table key="tbl-empty" width={400} height={200} columns={buildFitColumns()} dataSource={[]} />
    );
    const json = compileElement(el as any);
    const table = WidgetRegistry.createWidget(json)!;
    table.createElement(json);
    table.layout(createBoxConstraints({ maxWidth: 400, maxHeight: 200 }));

    expect(table.renderObject.size.height).toBe(200);

    const bodyScrollY = findWidget(table, 'ScrollView#tbl-empty-tbody-scroll-y') as any;
    expect(bodyScrollY).toBeTruthy();
    expect(bodyScrollY.renderObject.size.height).toBe(200 - rowH);
  });

  it('悬停在 Table 任意区域时应提升层叠顺序（zIndex）', () => {
    const el = <Table key="tbl-hover" columns={buildFitColumns()} dataSource={buildData()} />;
    const json = compileElement(el as any);
    const table = WidgetRegistry.createWidget(json)!;
    table.createElement(json);
    table.layout(createBoxConstraints({ maxWidth: 400, maxHeight: 200 }));

    const tableRoot = findWidget(table, 'Container#tbl-hover-root') as any;
    expect(tableRoot).toBeTruthy();
    expect(table.zIndex).toBe(1000);
    expect(tableRoot.zIndex).toBe(1000);

    (tableRoot.data as any).onPointerEnter?.();
    table.rebuild();
    table.layout(createBoxConstraints({ maxWidth: 400, maxHeight: 200 }));

    const tableRootAfterEnter = findWidget(table, 'Container#tbl-hover-root') as any;
    expect(table.zIndex).toBe(1001);
    expect(tableRootAfterEnter.zIndex).toBe(1001);

    (tableRootAfterEnter.data as any).onPointerLeave?.();
    table.rebuild();
    table.layout(createBoxConstraints({ maxWidth: 400, maxHeight: 200 }));

    const tableRootAfterLeave = findWidget(table, 'Container#tbl-hover-root') as any;
    expect(table.zIndex).toBe(1000);
    expect(tableRootAfterLeave.zIndex).toBe(1000);
  });

  it('大量数据时仅 Body 纵向滚动，Header 仍保持固定高度', () => {
    const tokens = getDefaultTokens();
    const rowH = tokens.controlHeight.middle;

    const data: RowData[] = [];
    for (let i = 0; i < 200; i++) {
      data.push({ key: String(i), name: `姓名${i}`, city: '城市' });
    }

    const el = (
      <Table key="tbl-big" width={400} height={200} columns={buildFitColumns()} dataSource={data} />
    );
    const json = compileElement(el as any);
    const table = WidgetRegistry.createWidget(json)!;
    table.createElement(json);
    table.layout(createBoxConstraints({ maxWidth: 400, maxHeight: 200 }));

    const header = findWidget(table, 'Row#tbl-big-thead') as any;
    expect(header).toBeTruthy();
    expect(header.renderObject.size.height).toBe(rowH);

    const bodyScrollY = findWidget(table, 'ScrollView#tbl-big-tbody-scroll-y') as any;
    expect(bodyScrollY).toBeTruthy();
    expect(bodyScrollY.renderObject.size.height).toBe(200 - rowH);
  });
});
