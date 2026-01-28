/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { ColorPicker, RichTextToolbar } from '../../rich-text-toolbar';
import { RichTextPanel } from '../index';

import { Themes } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function findByKey(node: any, key: string): any | null {
  if (!node) {
    return null;
  }
  if (node.key === key) {
    return node;
  }
  const children = node.children ?? [];
  for (let i = 0; i < children.length; i++) {
    const found = findByKey(children[i], key);
    if (found) {
      return found;
    }
  }
  return null;
}

function findFirstByType(node: any, type: string): any | null {
  if (!node) {
    return null;
  }
  if (node.__inkwellType === type) {
    return node;
  }
  const children = node.children ?? [];
  for (let i = 0; i < children.length; i++) {
    const found = findFirstByType(children[i], type);
    if (found) {
      return found;
    }
  }
  return null;
}

describe('RichTextPanel 浮动工具栏', () => {
  const theme = Themes.light;

  it('首次渲染应自动应用初始 spans（无需先聚焦）', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const panel = new RichTextPanel({
      theme,
      value: {
        text: 'abc',
        spans: [{ start: 0, end: 1, style: { bold: true } }],
      },
      onChange,
    } as any);
    (panel as any).owner = {} as any;

    const data = compileElement((panel as any).render());
    const editorNode = findByKey(data, 'rich-editor');
    expect(editorNode).toBeTruthy();

    const applyInitialSpans = vi.fn();
    editorNode.ref?.({ applyInitialSpans } as any);

    vi.runOnlyPendingTimers();
    expect(applyInitialSpans).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('浮动工具栏应展示选区格式激活态', () => {
    const onChange = vi.fn();
    const panel = new RichTextPanel({
      theme,
      value: 'abc',
      onChange,
    } as any);

    (panel as any).editorRef = {
      getSelectionViewportRectForOverlay: () => ({ left: 10, top: 10, width: 20, height: 10 }),
      getRichSelectionInfo: () => ({
        selectionStart: 0,
        selectionEnd: 1,
        focused: true,
        caretClientRect: null,
        selectionClientRect: null,
      }),
      getBoldForSelection: () => true,
      getItalicForSelection: () => false,
      getColorForSelection: () => '#B23A48',
      getFontSizeForSelection: () => null,
      getFontFamilyForSelection: () => null,
    };

    panel.state = {
      focused: true,
      selectionStart: 0,
      selectionEnd: 1,
      draggingSelection: false,
      selectionFromDrag: true,
    } as any;

    const panelTree = compileElement((panel as any).render());
    const toolbarElement = findFirstByType(panelTree, 'RichTextToolbar');
    expect(toolbarElement).toBeTruthy();

    const toolbar = new RichTextToolbar({
      theme: (toolbarElement as any).theme,
      editor: (toolbarElement as any).editor,
      variant: (toolbarElement as any).variant,
      colorPresets: (toolbarElement as any).colorPresets,
    } as any);
    (toolbar as any).owner = {} as any;

    const toolbarTree = compileElement((toolbar as any).render());
    const boldBtn = findByKey(toolbarTree, 'rt-btn-bold');
    const italicBtn = findByKey(toolbarTree, 'rt-btn-italic');
    expect((boldBtn as any).color).toBe(theme.state.selected);
    expect((italicBtn as any).color).toBe(theme.background.container);

    const colorPickerElement = findByKey(toolbarTree, 'rt-btn-color');
    expect(colorPickerElement).toBeTruthy();
    expect((colorPickerElement as any).__inkwellType).toBe('ColorPicker');

    const colorPicker = new ColorPicker({
      widgetKey: (colorPickerElement as any).widgetKey,
      theme: (colorPickerElement as any).theme,
      width: (colorPickerElement as any).width,
      height: (colorPickerElement as any).height,
      active: (colorPickerElement as any).active,
      triggerHoverKey: (colorPickerElement as any).triggerHoverKey,
      dropdownTop: (colorPickerElement as any).dropdownTop,
      dropdownLeft: (colorPickerElement as any).dropdownLeft,
      cols: (colorPickerElement as any).cols,
      swatchSize: (colorPickerElement as any).swatchSize,
      gap: (colorPickerElement as any).gap,
      padding: (colorPickerElement as any).padding,
      presets: (colorPickerElement as any).presets,
      hoveredKey: (colorPickerElement as any).hoveredKey,
      onHoverKey: (colorPickerElement as any).onHoverKey,
      swatchWidgetKey: (colorPickerElement as any).swatchWidgetKey,
      onPick: (colorPickerElement as any).onPick,
      onOpen: (colorPickerElement as any).onOpen,
      onClose: (colorPickerElement as any).onClose,
    } as any);
    (colorPicker as any).owner = {} as any;

    const colorTree = compileElement((colorPicker as any).render());
    const colorTrigger = findByKey(colorTree, 'rt-btn-color');
    expect((colorTrigger as any).color).toBe(theme.state.selected);
  });

  it('失焦后仍应保持浮动工具栏可见', () => {
    const onChange = vi.fn();
    const panel = new RichTextPanel({
      theme,
      value: 'abc',
      onChange,
    } as any);

    (panel as any).editorRef = {
      getSelectionViewportRectForOverlay: () => ({ left: 10, top: 10, width: 20, height: 10 }),
    };

    panel.state = {
      focused: false,
      selectionStart: 0,
      selectionEnd: 1,
      draggingSelection: false,
      selectionFromDrag: true,
    } as any;

    const data = compileElement((panel as any).render());
    expect(findFirstByType(data, 'RichTextToolbar')).not.toBeNull();
  });

  it('编辑器 blur 不应清空 selectionFromDrag', () => {
    const onChange = vi.fn();
    const panel = new RichTextPanel({
      theme,
      value: 'abc',
      onChange,
    } as any);

    (panel as any).editorRef = {
      getSelectionViewportRectForOverlay: () => ({ left: 10, top: 10, width: 20, height: 10 }),
    };

    panel.state = {
      focused: true,
      selectionStart: 0,
      selectionEnd: 1,
      draggingSelection: false,
      selectionFromDrag: true,
    } as any;

    const data = compileElement((panel as any).render());
    const editorNode = findByKey(data, 'rich-editor');
    expect(editorNode).toBeTruthy();
    editorNode.onBlur?.();

    expect(panel.state.focused).toBe(false);
    expect(panel.state.selectionFromDrag).toBe(true);
  });

  it('点击面板空白应关闭浮动工具栏', () => {
    const onChange = vi.fn();
    const onSelectionInfo = vi.fn();
    const panel = new RichTextPanel({
      theme,
      value: 'abc',
      onChange,
      onSelectionInfo,
    } as any);

    (panel as any).editorRef = {
      getSelectionViewportRectForOverlay: () => ({ left: 10, top: 10, width: 20, height: 10 }),
      getRichSelectionInfo: () => ({
        selectionStart: 0,
        selectionEnd: 1,
        focused: false,
        caretClientRect: null,
        selectionClientRect: null,
      }),
    };

    panel.state = {
      focused: false,
      selectionStart: 0,
      selectionEnd: 1,
      draggingSelection: false,
      selectionFromDrag: true,
    } as any;

    const data = compileElement((panel as any).render());
    const frame = findByKey(data, 'rich-text-panel-frame');
    expect(frame).toBeTruthy();
    frame.onPointerDown?.();

    expect(panel.state.selectionFromDrag).toBe(false);
  });
});
