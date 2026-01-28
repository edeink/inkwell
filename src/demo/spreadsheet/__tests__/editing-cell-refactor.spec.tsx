import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Spreadsheet, type SpreadsheetProps } from '../spreadsheet';
import { SpreadsheetModel } from '../spreadsheet-model';
import { SpreadsheetEditableText } from '../widgets/editable-text';

// Mock Widgets
vi.mock('../widgets/editable-text', () => ({
  SpreadsheetEditableText: class MockSpreadsheetEditableText {
    props: any;
    constructor(props: any) {
      this.props = props;
    }
    render() {
      return null;
    }
  },
}));

vi.mock('../widgets/grid', () => ({
  SpreadsheetGrid: () => null,
}));

vi.mock('../widgets/col-header', () => ({
  ColumnHeaders: () => null,
}));

vi.mock('../widgets/row-header', () => ({
  RowHeaders: () => null,
}));

vi.mock('../widgets/corner', () => ({
  CornerHeader: () => null,
}));

vi.mock('@/core/viewport/scroll-view', () => ({
  ScrollView: () => null,
}));

describe('Spreadsheet Editing Cell Refactor', () => {
  let model: SpreadsheetModel;
  let props: SpreadsheetProps;

  beforeEach(() => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    model = new SpreadsheetModel();
    props = {
      width: 800,
      height: 600,
      theme: {
        background: { base: '#fff' },
        text: { primary: '#000' },
        border: { base: '#ccc' },
        component: { gridLine: '#eee' },
      } as any,
      model,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('始终渲染 SpreadsheetEditableText，并通过 visible 控制可见性', () => {
    const spreadsheet = new Spreadsheet(props);
    const element = spreadsheet.render();

    // 查找 SpreadsheetEditableText
    function findEditor(el: any): any {
      if (!el) {
        return null;
      }
      if (el.type === SpreadsheetEditableText) {
        return el;
      }

      const props = el.props || {};
      if (props.children) {
        if (Array.isArray(props.children)) {
          for (const child of props.children) {
            const found = findEditor(child);
            if (found) {
              return found;
            }
          }
        } else {
          return findEditor(props.children);
        }
      }
      return null;
    }

    // 初始状态 (非编辑态)
    let editor = findEditor(element);
    expect(editor).toBeTruthy();
    expect(editor.props.visible).toBe(false);

    // 模拟进入编辑态 (双击)
    // @ts-ignore
    spreadsheet.handleCellDoubleClick(1, 1);

    // 重新渲染
    const editingElement = spreadsheet.render();
    editor = findEditor(editingElement);
    expect(editor).toBeTruthy();
    expect(editor.props.visible).toBe(true);
    expect(editor.props.value).toBe(model.getCell(1, 1)?.value || '');
  });

  it('在非编辑态下，位置计算应保持稳健 (即使用默认值)', () => {
    const spreadsheet = new Spreadsheet(props);
    // @ts-ignore
    spreadsheet.state.editingCell = null;

    const element = spreadsheet.render();

    // 查找 SpreadsheetEditableText
    function findEditor(el: any): any {
      if (!el) {
        return null;
      }
      if (el.type === SpreadsheetEditableText) {
        return el;
      }
      const props = el.props || {};
      if (props.children) {
        if (Array.isArray(props.children)) {
          for (const child of props.children) {
            const found = findEditor(child);
            if (found) {
              return found;
            }
          }
        } else {
          return findEditor(props.children);
        }
      }
      return null;
    }

    const editor = findEditor(element);
    expect(editor).toBeTruthy();
    // 即使不可见，x, y 也应该有数值 (基于 row=0, col=0)
    expect(typeof editor.props.x).toBe('number');
    expect(typeof editor.props.y).toBe('number');
  });

  it('事件处理：确保 onFinish 回调能正确清除 visible 状态', () => {
    const spreadsheet = new Spreadsheet(props);
    // 进入编辑态
    // @ts-ignore
    spreadsheet.handleCellDoubleClick(1, 1);
    // @ts-ignore
    expect(spreadsheet.state.editingCell).toEqual({ row: 1, col: 1 });

    // 触发 finish
    // @ts-ignore
    spreadsheet.handleEditFinish(1, 1, 'new value');

    // @ts-ignore
    expect(spreadsheet.state.editingCell).toBeNull();

    // 验证渲染结果
    const element = spreadsheet.render();
    function findEditor(el: any): any {
      if (!el) {
        return null;
      }
      if (el.type === SpreadsheetEditableText) {
        return el;
      }
      const props = el.props || {};
      if (props.children) {
        if (Array.isArray(props.children)) {
          for (const child of props.children) {
            const found = findEditor(child);
            if (found) {
              return found;
            }
          }
        } else {
          return findEditor(props.children);
        }
      }
      return null;
    }
    const editor = findEditor(element);
    expect(editor.props.visible).toBe(false);
  });
});
