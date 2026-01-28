import { describe, expect, it, vi } from 'vitest';

import { SpreadsheetModel } from '../../spreadsheet-model';
import { SpreadsheetGrid } from '../grid';

import { Themes } from '@/styles/theme';

// 如果需要，可以 Mock Inkwell 核心组件，或者使用真实的组件
// 由于我们主要测试逻辑，可以检查渲染后的树或属性

describe('SpreadsheetGrid 编辑交互', () => {
  const model = new SpreadsheetModel();
  const theme = Themes.light;

  it('双击单元格应触发 onCellDoubleClick 回调', () => {
    const onCellDoubleClick = vi.fn();
    const grid = new SpreadsheetGrid({
      model,
      theme,
      scrollX: 0,
      scrollY: 0,
      viewportWidth: 800,
      viewportHeight: 600,
      showGridLines: true,
      onCellDown: vi.fn(),
      onCellDoubleClick,
    } as any);

    // 模拟构建过程
    // 由于我们不能直接在单元测试中运行完整的 Widget 树构建和事件分发，
    // 我们主要验证组件的 render 方法生成的结构中包含正确的事件绑定。

    // 这里我们简单调用 render 获取结果
    const result = grid.render();

    // 我们需要找到对应的 Cell Container 并调用其 onDoubleClick
    // 这需要遍历 result.props.children
    // 这是一个简化的测试，实际集成测试会更复杂

    // 假设我们在 (0, 0) 位置有一个单元格
    // 遍历 result 找到 (0,0) 的 Positioned -> Container
    // 这是一个比较脆弱的查找方式，但在没有完整测试库支持下可行

    const stack = result.props.children; // Container -> Stack
    const cells = stack.props.children; // Stack children array

    // 查找 (0,0) 单元格
    // 它的 key 应该是 `cell-0-0`
    const cell00 = cells.find((c: any) => c.key === 'cell-0-0');
    expect(cell00).toBeDefined();

    const container = cell00.props.children;
    expect(container.props.onDoubleClick).toBeDefined();

    // 触发双击
    container.props.onDoubleClick();

    expect(onCellDoubleClick).toHaveBeenCalledWith(0, 0);
  });

  it('渲染选区时应包含填充手柄 (Fill Handle)', () => {
    const grid = new SpreadsheetGrid({
      model,
      theme,
      scrollX: 0,
      scrollY: 0,
      viewportWidth: 800,
      viewportHeight: 600,
      showGridLines: true,
      onCellDown: vi.fn(),
      onCellDoubleClick: vi.fn(),
      selections: [
        { startRow: 0, startCol: 0, endRow: 1, endCol: 1 }, // Secondary
        { startRow: 2, startCol: 2, endRow: 2, endCol: 2 }, // Primary (Last)
      ],
    } as any);

    const result = grid.render();
    const cells = result.props.children.props.children;

    // 应该有两个选区边框
    const border0 = cells.find((c: any) => c.key === 'selection-border-0');
    const border1 = cells.find((c: any) => c.key === 'selection-border-1');
    expect(border0).toBeDefined();
    expect(border1).toBeDefined();

    // 应该只有一个填充手柄，对应索引 1 (Primary)
    const handle0 = cells.find((c: any) => c.key === 'selection-handle-0');
    const handle1 = cells.find((c: any) => c.key === 'selection-handle-1');

    expect(handle0).toBeUndefined(); // 非主选区不应有手柄
    expect(handle1).toBeDefined(); // 主选区应有手柄

    // 验证手柄样式
    const handleContainer = handle1.props.children;
    expect(handleContainer.props.cursor).toBe('crosshair');
    expect(handleContainer.props.color).toBe(theme.primary);
  });
});
