/** @jsxImportSource @/utils/compiler */
/**
 * 文件用途：RichTextToolbar 内部可复用组件的单元测试。
 * 主要功能：
 * - 校验触发器/下拉面板的基础渲染结构与关键交互回调
 * - 确保 hover、click 等事件透传逻辑稳定
 * 作者：InkWell 团队
 * 最后修改日期：2026-01-24
 */
import { describe, expect, it, vi } from 'vitest';

import {
  ColorPicker,
  Select,
  ToolbarButton,
  ToolbarColorPickerDropdown,
  ToolbarColorPickerTrigger,
} from '../index';

import { Text } from '@/core';
import { Themes } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function findByKey(node: any, key: string): any | null {
  if (!node || typeof node !== 'object') {
    return null;
  }
  if (node.key === key) {
    return node;
  }
  const children = node.children as any[] | undefined;
  if (!children) {
    return null;
  }
  for (const c of children) {
    const hit = findByKey(c, key);
    if (hit) {
      return hit;
    }
  }
  return null;
}

describe('RichTextToolbar - 可复用组件', () => {
  const theme = Themes.light;

  it('ToolbarButton：默认 cursor 为 pointer，并透传 children', () => {
    const data = compileElement(
      <ToolbarButton
        widgetKey="rt-test-btn"
        theme={theme}
        width={28}
        height={28}
        backgroundColor={theme.background.container}
      >
        <Text key="rt-test-btn-text" text="X" />
      </ToolbarButton>,
    );

    expect(data.type).toBe('Container');
    expect(data.key).toBe('rt-test-btn');
    expect((data as any).cursor).toBe('pointer');
    expect((data as any).width).toBe(28);
    expect((data as any).height).toBe(28);
    expect((data as any).color).toBe(theme.background.container);
    expect((data as any).border?.color).toBe(theme.border.base);
    expect(data.children?.[0].type).toBe('Text');
    expect((data.children?.[0] as any).text).toBe('X');
  });

  it('Select：支持打开/收起、hover 高亮与点击选择', () => {
    const onHoverKey = vi.fn();
    const onSelect = vi.fn();
    const onOpen = vi.fn();
    const onClose = vi.fn();

    const widget = new Select<number>({
      type: 'Select',
      key: 'rt-test-select',
      widgetKey: 'rt-test-select',
      theme,
      width: 56,
      height: 28,
      label: '字号',
      triggerHoverKey: 'fontSize',
      options: [
        { label: '12px', value: 12, hoverKey: 'fs-12', widgetKey: 'rt-opt-12' },
        { label: '14px', value: 14, hoverKey: 'fs-14', widgetKey: 'rt-opt-14' },
      ],
      onSelect,
      dropdownTop: 34,
      viewportHeight: 80,
      itemHeight: 24,
      itemGap: 4,
      hoveredKey: null,
      onHoverKey,
      onOpen,
      onClose,
    } as any);

    const closed = compileElement((widget as any).render());
    const trigger = findByKey(closed, 'rt-test-select-trigger');
    expect(trigger).toBeTruthy();
    expect((trigger as any).color).toBe(theme.background.container);

    (widget as any).setOpened(true);
    expect(onOpen).toHaveBeenCalledTimes(1);
    const opened = compileElement((widget as any).render());
    const openedTrigger = findByKey(opened, 'rt-test-select-trigger');
    expect((openedTrigger as any).color).toBe(theme.state.hover);
    const dropdown = findByKey(opened, 'rt-test-select-dropdown');
    expect(dropdown).toBeTruthy();

    const opt12 = findByKey(opened, 'rt-opt-12');
    expect(opt12).toBeTruthy();
    opt12.onPointerEnter?.();
    const stopPropagation = vi.fn();
    opt12.onPointerDown?.({ stopPropagation } as any);

    expect(onHoverKey).toHaveBeenCalledWith('fs-12');
    expect(onHoverKey).toHaveBeenCalledWith(null);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(12);
    expect(onClose).toHaveBeenCalledTimes(1);

    const closedAfterPick = compileElement((widget as any).render());
    expect(findByKey(closedAfterPick, 'rt-test-select-dropdown')).toBeNull();
  });

  it('ToolbarColorPickerTrigger：打开时使用 hover 背景色，并渲染 Icon', () => {
    const data = compileElement(
      <ToolbarColorPickerTrigger
        widgetKey="rt-test-color-trigger"
        theme={theme}
        width={28}
        height={28}
        opened={true}
        hovered={false}
      />,
    );

    expect(data.type).toBe('Container');
    expect(data.key).toBe('rt-test-color-trigger');
    expect((data as any).color).toBe(theme.state.hover);
    expect(data.children?.[0].type).toBe('Icon');
  });

  it('ToolbarColorPickerDropdown：色块点击应触发 onPick，并阻止冒泡', () => {
    const onPick = vi.fn();
    const data = compileElement(
      <ToolbarColorPickerDropdown
        widgetKey="rt-test-color-dd"
        theme={theme}
        left={0}
        top={0}
        cols={6}
        swatchSize={22}
        gap={6}
        padding={8}
        presets={[
          { label: '红', value: '#f00' },
          { label: '绿', value: '#0f0' },
        ]}
        hoveredKey={null}
        onHoverKey={vi.fn()}
        swatchWidgetKey={(color) => `rt-swatch-${color}`}
        onPick={onPick}
      />,
    );

    const swatch = findByKey(data, 'rt-swatch-#f00');
    expect(swatch).toBeTruthy();

    const stopPropagation = vi.fn();
    swatch.onPointerDown?.({ stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('#f00');
  });

  it('ColorPicker：支持打开/收起，并在取色后自动收起', () => {
    const onHoverKey = vi.fn();
    const onPick = vi.fn();
    const onOpen = vi.fn();
    const onClose = vi.fn();

    const widget = new ColorPicker({
      type: 'ColorPicker',
      key: 'rt-test-cp',
      widgetKey: 'rt-test-cp',
      theme,
      width: 28,
      height: 28,
      triggerHoverKey: 'color',
      dropdownTop: 34,
      dropdownLeft: 0,
      cols: 2,
      swatchSize: 22,
      gap: 6,
      padding: 8,
      presets: [
        { label: '红', value: '#f00' },
        { label: '绿', value: '#0f0' },
      ],
      hoveredKey: null,
      onHoverKey,
      swatchWidgetKey: (color: string) => `rt-cp-swatch-${color}`,
      onPick,
      onOpen,
      onClose,
    } as any);

    const closed = compileElement((widget as any).render());
    expect(findByKey(closed, 'rt-test-cp')).toBeTruthy();
    expect(findByKey(closed, 'rt-test-cp-dropdown')).toBeNull();

    (widget as any).setOpened(true);
    expect(onOpen).toHaveBeenCalledTimes(1);

    const opened = compileElement((widget as any).render());
    expect(findByKey(opened, 'rt-test-cp-dropdown')).toBeTruthy();

    const swatch = findByKey(opened, 'rt-cp-swatch-#f00');
    expect(swatch).toBeTruthy();

    const stopPropagation = vi.fn();
    swatch.onPointerDown?.({ stopPropagation } as any);

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('#f00');
    expect(onHoverKey).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalledTimes(1);

    const closedAfterPick = compileElement((widget as any).render());
    expect(findByKey(closedAfterPick, 'rt-test-cp-dropdown')).toBeNull();
  });
});
