/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SpreadsheetModel } from '../spreadsheet-model';

import { ColumnHeaders } from './col-header';
import { SpreadsheetGrid } from './grid';
import { RowHeaders } from './row-header';

import Runtime from '@/runtime';
import { Themes } from '@/styles/theme';

// 全局模拟 Canvas API
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = ((type: string) => {
    if (type === '2d') {
      return {
        font: '',
        measureText: (text: string) => ({ width: text.length * 10 }),
        fillText: () => {},
        strokeText: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        quadraticCurveTo: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        closePath: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        clearRect: () => {},
        setTransform: () => {},
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        rect: () => {},
        clip: () => {},
        canvas: document.createElement('canvas'),
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  }) as any;
}

describe('Spreadsheet Widgets (拆分组件测试)', () => {
  let container: HTMLElement;
  let runtime: Runtime;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'widgets-test-container';
    document.body.appendChild(container);
    runtime = await Runtime.create(container.id);
  });

  afterEach(() => {
    if (runtime) {
      runtime.destroy();
    }
    document.body.innerHTML = '';
  });

  describe('SpreadsheetGrid', () => {
    it('正确渲染可见区域的单元格', async () => {
      const model = new SpreadsheetModel();
      model.setCell(0, 0, { value: 'A1' });

      const el = (
        <SpreadsheetGrid
          theme={Themes.light}
          showGridLines={true}
          gridLineColor="#E5E5E5"
          model={model}
          scrollX={0}
          scrollY={0}
          viewportWidth={500}
          viewportHeight={500}
          selection={null}
          editingCell={null}
          onCellDown={vi.fn()}
          onCellDoubleClick={vi.fn()}
          onEditFinish={vi.fn()}
          onEditCancel={vi.fn()}
        />
      );

      await runtime.renderFromJSX(el);
      const grid = runtime.getRootWidget();
      expect(grid).toBeTruthy();
    });
  });

  describe('ColumnHeaders', () => {
    it('正确生成多个列头 (验证布局修复)', async () => {
      const model = new SpreadsheetModel();
      const el = (
        <ColumnHeaders
          theme={Themes.light}
          model={model}
          scrollX={0}
          viewportWidth={500}
          selection={null}
          onResizeStart={vi.fn()}
          onHeaderClick={vi.fn()}
        />
      );

      await runtime.renderFromJSX(el);
      const root = runtime.getRootWidget() as any;
      // 结构: ColumnHeaders -> Container -> Stack
      // ColumnHeaders 是 StatefulWidget，它的 children 包含 render 返回的组件
      const container = root.children[0];
      const stack = container.children[0];

      expect(stack).toBeDefined();
      // 验证子节点数量大于 1 (如果只显示 1 列，数量会很少)
      expect(stack.children.length).toBeGreaterThan(5);
    });
  });

  describe('RowHeaders', () => {
    it('正确生成多个行头 (验证布局修复)', async () => {
      const model = new SpreadsheetModel();
      const el = (
        <RowHeaders
          theme={Themes.light}
          showGridLines={true}
          gridLineColor="#E5E5E5"
          model={model}
          scrollY={0}
          viewportHeight={500}
          selection={null}
          onResizeStart={vi.fn()}
          onHeaderClick={vi.fn()}
        />
      );

      await runtime.renderFromJSX(el);
      const root = runtime.getRootWidget() as any;
      // 结构: RowHeaders -> Container -> Stack
      const container = root.children[0];
      const stack = container.children[0];

      expect(stack).toBeDefined();
      // 视口高 500，默认行高 24 -> 约 20 行
      expect(stack.children.length).toBeGreaterThan(10);
    });
  });
});
