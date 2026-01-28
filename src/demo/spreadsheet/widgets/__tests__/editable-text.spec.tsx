import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SpreadsheetEditableText, type SpreadsheetEditableTextProps } from '../editable-text';

import { TextArea } from '@/core';

// Mock TextLayout
vi.mock('@/core/text/layout', () => ({
  TextLayout: {
    layout: vi.fn(() => ({ width: 100, height: 20 })),
  },
}));

describe('SpreadsheetEditableText 组件', () => {
  let props: SpreadsheetEditableTextProps;
  // let element: Element;

  beforeEach(() => {
    props = {
      x: 10,
      y: 10,
      minWidth: 100,
      minHeight: 30,
      maxWidth: 500,
      maxHeight: 500,
      value: '测试文本',
      theme: {
        background: { base: '#fff' },
        text: { primary: '#000' },
        primary: '#blue',
      } as any,
      onFinish: vi.fn(),
      onCancel: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确初始化状态', () => {
    const widget = new SpreadsheetEditableText(props);
    // @ts-ignore - accessing private state for testing
    expect(widget.state.value).toBe('测试文本');
    // @ts-ignore
    expect(widget.state.isSaved).toBe(false);
  });

  it('属性变化时应该更新状态 (复用编辑器场景)', () => {
    const widget = new SpreadsheetEditableText(props);

    // 模拟切换到新单元格
    const newProps = { ...props, value: '新文本', x: 200 };
    // @ts-ignore
    widget.didUpdateWidget(props); // This is not quite right, didUpdateWidget takes oldProps

    // Manually call didUpdateWidget logic or simulate update lifecycle
    // Since we can't easily simulate full lifecycle without renderer, we call didUpdateWidget directly
    // @ts-ignore
    widget.props = newProps;
    // @ts-ignore
    widget.didUpdateWidget(props); // props passed here is OLD props

    // @ts-ignore
    expect(widget.state.value).toBe('新文本');
    // @ts-ignore
    expect(widget.state.isSaved).toBe(false);
  });

  it('选区变化时应该触发保存', () => {
    const widget = new SpreadsheetEditableText(props);

    // 模拟选区变化事件
    const event = new Event('spreadsheet-selection-change');
    window.dispatchEvent(event);

    expect(props.onFinish).toHaveBeenCalledWith('测试文本');
    // @ts-ignore
    expect(widget.state.isSaved).toBe(true);
  });

  it('如果已保存，选区变化不应再次触发保存', () => {
    const widget = new SpreadsheetEditableText(props);

    // 先手动触发一次保存
    // @ts-ignore
    widget.handleFinish('测试文本');
    expect(props.onFinish).toHaveBeenCalledTimes(1);

    // 再触发选区变化
    const event = new Event('spreadsheet-selection-change');
    window.dispatchEvent(event);

    expect(props.onFinish).toHaveBeenCalledTimes(1);
  });

  it('dispose 后不应继续响应选区变化事件', () => {
    const widget = new SpreadsheetEditableText(props);
    widget.dispose();

    const event = new Event('spreadsheet-selection-change');
    window.dispatchEvent(event);

    expect(props.onFinish).not.toHaveBeenCalled();
  });

  it('CoreEditableText 应该接收 visible 属性且不使用 key (复用实例)', () => {
    const widget = new SpreadsheetEditableText(props);
    const element = widget.render();

    // Helper to find TextArea element
    function findCoreElement(el: any): any {
      if (!el) {
        return null;
      }
      if (el.type === TextArea) {
        return el;
      }

      const props = el.props || {};

      // Handle single child
      if (props.child) {
        const found = findCoreElement(props.child);
        if (found) {
          return found;
        }
      }

      // Handle children array
      if (props.children) {
        if (Array.isArray(props.children)) {
          for (const child of props.children) {
            const found = findCoreElement(child);
            if (found) {
              return found;
            }
          }
        } else {
          return findCoreElement(props.children);
        }
      }

      return null;
    }

    const coreElement = findCoreElement(element);
    expect(coreElement).toBeTruthy();
    // key 应该被移除或为 undefined/null
    expect(coreElement.key).toBeNull();
    expect(coreElement.props.autoFocus).toBe(true);
    expect(coreElement.props.disabled).toBe(false);

    // 测试 visible=false
    const hiddenProps = { ...props, visible: false };
    // @ts-ignore
    widget.props = hiddenProps;
    // @ts-ignore
    widget.didUpdateWidget(props); // Update widget with hidden props

    const hiddenElement = widget.render();
    const hiddenCoreElement = findCoreElement(hiddenElement);
    expect(hiddenCoreElement).toBeTruthy();
    expect(hiddenCoreElement.props.autoFocus).toBe(false);
    expect(hiddenCoreElement.props.disabled).toBe(true);
  });

  it('Type Error Check: 构造函数和 setState 应符合类型定义', () => {
    const widget = new SpreadsheetEditableText(props);
    // @ts-ignore
    const state = widget.state;
    expect(state.value).toBe('测试文本');
    expect(state.width).toBeGreaterThan(0);
    expect(state.height).toBeGreaterThan(0);
    expect(state.isSaved).toBe(false);

    // 模拟 handleFinish 中的 setState
    // @ts-ignore
    widget.handleFinish('new value');
    // @ts-ignore
    expect(widget.state.isSaved).toBe(true);
    // @ts-ignore
    expect(widget.state.value).toBe('');

    // 验证 width/height 是否保留或重置 (当前逻辑是重置为 emptyState 的宽高)
    // @ts-ignore
    expect(widget.state.width).toBeGreaterThan(0);
  });

  it('onBlur: 应该触发 handleFinish', () => {
    const widget = new SpreadsheetEditableText(props);
    const element = widget.render();

    // Helper to find TextArea element
    function findCoreElement(el: any): any {
      if (!el) {
        return null;
      }
      if (el.type === TextArea) {
        return el;
      }

      const props = el.props || {};

      if (props.child) {
        const found = findCoreElement(props.child);
        if (found) {
          return found;
        }
      }

      if (props.children) {
        if (Array.isArray(props.children)) {
          for (const child of props.children) {
            const found = findCoreElement(child);
            if (found) {
              return found;
            }
          }
        } else {
          return findCoreElement(props.children);
        }
      }
      return null;
    }

    const coreElement = findCoreElement(element);
    expect(coreElement).toBeTruthy();

    // 触发 onBlur
    if (coreElement.props.onBlur) {
      coreElement.props.onBlur();
      expect(props.onFinish).toHaveBeenCalledWith('测试文本');
    } else {
      throw new Error('TextArea 缺少 onBlur 属性');
    }
  });
});
