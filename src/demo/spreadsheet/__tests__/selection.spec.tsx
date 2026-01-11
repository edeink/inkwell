/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Spreadsheet } from '../spreadsheet';
import { SpreadsheetModel } from '../spreadsheet-model';

import type { InkwellEvent } from '@/core/events/types';

import { Themes } from '@/styles/theme';

describe('Spreadsheet Selection Logic', () => {
  let spreadsheet: Spreadsheet;
  let model: SpreadsheetModel;

  beforeEach(() => {
    // Mock window methods
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
    window.dispatchEvent = vi.fn();

    model = new SpreadsheetModel();
    spreadsheet = new Spreadsheet({
      type: 'Spreadsheet',
      width: 800,
      height: 600,
      theme: Themes.light,
      model,
    });

    // 初始化状态
    (spreadsheet as any).state = {
      scrollX: 0,
      scrollY: 0,
      selections: [],
      editingCell: null,
      resizing: null,
      version: 0,
      isDarkMode: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 辅助函数：模拟 InkwellEvent
  function createEvent(
    props: Partial<InkwellEvent> & { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean },
  ): InkwellEvent {
    return {
      type: 'pointerdown',
      target: {} as any,
      currentTarget: {} as any,
      eventPhase: 2,
      x: 0,
      y: 0,
      stopPropagation: vi.fn(),
      propagationStopped: false,
      ...props,
    };
  }

  // 访问私有方法
  function getPrivateMethod(name: string) {
    return (spreadsheet as any)[name];
  }

  // 访问私有属性
  function getPrivateProp(name: string) {
    return (spreadsheet as any)[name];
  }

  it('普通点击应创建单选区', () => {
    const handleCellDown = getPrivateMethod('handleCellDown');

    // Click (1, 1)
    handleCellDown(1, 1, createEvent({}));

    expect(spreadsheet.state.selections).toHaveLength(1);
    expect(spreadsheet.state.selections[0]).toEqual({
      startRow: 1,
      startCol: 1,
      endRow: 1,
      endCol: 1,
    });
    expect(getPrivateProp('_anchor')).toEqual({ row: 1, col: 1 });
    expect(getPrivateProp('_cursor')).toEqual({ row: 1, col: 1 });
  });

  it('Ctrl/Meta 点击应添加选区', () => {
    const handleCellDown = getPrivateMethod('handleCellDown');

    // Click (1, 1)
    handleCellDown(1, 1, createEvent({}));

    // Ctrl+Click (3, 3)
    handleCellDown(3, 3, createEvent({ ctrlKey: true }));

    expect(spreadsheet.state.selections).toHaveLength(2);
    expect(spreadsheet.state.selections[0]).toEqual({
      startRow: 1,
      startCol: 1,
      endRow: 1,
      endCol: 1,
    });
    expect(spreadsheet.state.selections[1]).toEqual({
      startRow: 3,
      startCol: 3,
      endRow: 3,
      endCol: 3,
    });
    // 锚点和光标应更新为新的点击位置
    expect(getPrivateProp('_anchor')).toEqual({ row: 3, col: 3 });
    expect(getPrivateProp('_cursor')).toEqual({ row: 3, col: 3 });
  });

  it('Shift 点击应扩展选区', () => {
    const handleCellDown = getPrivateMethod('handleCellDown');

    // Click (1, 1)
    handleCellDown(1, 1, createEvent({}));

    // Shift+Click (3, 3)
    handleCellDown(3, 3, createEvent({ shiftKey: true }));

    expect(spreadsheet.state.selections).toHaveLength(1);
    expect(spreadsheet.state.selections[0]).toEqual({
      startRow: 1,
      startCol: 1,
      endRow: 3,
      endCol: 3,
    });
    // 锚点保持不变，光标更新
    expect(getPrivateProp('_anchor')).toEqual({ row: 1, col: 1 });
    expect(getPrivateProp('_cursor')).toEqual({ row: 3, col: 3 });
  });

  it('Shift + Arrow 键盘导航应扩展选区', () => {
    const handleCellDown = getPrivateMethod('handleCellDown');
    const handleKeyDown = getPrivateMethod('handleKeyDown');

    // Click (1, 1)
    handleCellDown(1, 1, createEvent({}));

    // Shift + ArrowDown
    handleKeyDown({
      key: 'ArrowDown',
      shiftKey: true,
      preventDefault: vi.fn(),
    });

    expect(spreadsheet.state.selections).toHaveLength(1);
    expect(spreadsheet.state.selections[0]).toEqual({
      startRow: 1,
      startCol: 1,
      endRow: 2,
      endCol: 1,
    });
    expect(getPrivateProp('_anchor')).toEqual({ row: 1, col: 1 });
    expect(getPrivateProp('_cursor')).toEqual({ row: 2, col: 1 });
  });

  it('普通 Arrow 键盘导航应移动光标并重置选区', () => {
    const handleCellDown = getPrivateMethod('handleCellDown');
    const handleKeyDown = getPrivateMethod('handleKeyDown');

    // Click (1, 1)
    handleCellDown(1, 1, createEvent({}));

    // Shift + ArrowDown (Select 1,1 -> 2,1)
    handleKeyDown({
      key: 'ArrowDown',
      shiftKey: true,
      preventDefault: vi.fn(),
    });

    // ArrowRight (Should reset selection to single cell at 2,2)
    // 注意：当前光标在 2,1，右移到 2,2
    handleKeyDown({
      key: 'ArrowRight',
      shiftKey: false,
      preventDefault: vi.fn(),
    });

    expect(spreadsheet.state.selections).toHaveLength(1);
    expect(spreadsheet.state.selections[0]).toEqual({
      startRow: 2,
      startCol: 2,
      endRow: 2,
      endCol: 2,
    });
    expect(getPrivateProp('_anchor')).toEqual({ row: 2, col: 2 });
    expect(getPrivateProp('_cursor')).toEqual({ row: 2, col: 2 });
  });

  it('拖拽选择应更新选区', () => {
    const handleCellDown = getPrivateMethod('handleCellDown');
    const handleCellHover = getPrivateMethod('handleCellHover');

    // Mouse Down (1, 1)
    handleCellDown(1, 1, createEvent({}));

    // Hover (2, 2)
    handleCellHover(2, 2);

    expect(spreadsheet.state.selections).toHaveLength(1);
    expect(spreadsheet.state.selections[0]).toEqual({
      startRow: 1,
      startCol: 1,
      endRow: 2,
      endCol: 2,
    });
    expect(getPrivateProp('_anchor')).toEqual({ row: 1, col: 1 });
    expect(getPrivateProp('_cursor')).toEqual({ row: 2, col: 2 });
  });
});
