/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { SpreadsheetModel } from '../../spreadsheet-model';
import { SpreadsheetGrid } from '../grid';

import { Container } from '@/core/container';
import { Themes } from '@/styles/theme';

describe('SpreadsheetGrid 交互测试', () => {
  it('应当在单元格按下时阻止事件冒泡以防止滚动', () => {
    const model = new SpreadsheetModel();
    const onCellDown = vi.fn();

    const grid = new SpreadsheetGrid({
      model,
      theme: Themes.light,
      scrollX: 0,
      scrollY: 0,
      viewportWidth: 800,
      viewportHeight: 600,
      showGridLines: true,
      onCellDown,
      onCellDoubleClick: vi.fn(),
    });

    // 渲染网格
    const rootElement = grid.render();

    // 结构: Container -> Stack -> [Positioned -> Container(cell), ...]
    // 辅助函数：查找第一个单元格容器
    function findFirstCell(el: any): any {
      // 检查类型是否匹配 Container 类
      if (el.type === Container && el.props.onPointerDown) {
        return el;
      }
      const children = el.props?.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          const found = findFirstCell(child);
          if (found) {
            return found;
          }
        }
      } else if (children) {
        return findFirstCell(children);
      }
      return null;
    }

    const cell = findFirstCell(rootElement);
    expect(cell).toBeTruthy();

    // 验证光标样式
    expect(cell.props.cursor).toBe('cell');

    // 验证停止冒泡
    const stopPropagation = vi.fn();
    const event = { stopPropagation } as any;

    cell.props.onPointerDown(event);

    expect(stopPropagation).toHaveBeenCalled();
    expect(onCellDown).toHaveBeenCalled();
  });
});
