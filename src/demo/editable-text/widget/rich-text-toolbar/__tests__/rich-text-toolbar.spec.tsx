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

import type { WidgetProps } from '@/core/type';
import type { ThemePalette } from '@/styles/theme';

import { Container, StatefulWidget, Text } from '@/core';
import { dispatchToTree } from '@/core/events/dispatcher';
import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';
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

    expect(data.__inkwellType).toBe('Container');
    expect(data.key).toBe('rt-test-btn');
    expect((data as any).cursor).toBe('pointer');
    expect((data as any).width).toBe(28);
    expect((data as any).height).toBe(28);
    expect((data as any).color).toBe(theme.background.container);
    expect((data as any).border?.color).toBe(theme.border.base);
    expect(data.children?.[0].__inkwellType).toBe('Text');
    expect((data.children?.[0] as any).text).toBe('X');
  });

  it('Select：支持打开/收起、hover 高亮与点击选择', () => {
    const onHoverKey = vi.fn();
    const onSelect = vi.fn();
    const onOpen = vi.fn();
    const onClose = vi.fn();

    const widget = new Select<number>({
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

    expect(data.__inkwellType).toBe('Container');
    expect(data.key).toBe('rt-test-color-trigger');
    expect((data as any).color).toBe(theme.state.hover);
    expect(data.children?.[0].__inkwellType).toBe('Icon');
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

interface TestHostProps extends WidgetProps {
  theme: ThemePalette;
}

interface TestHostState {
  tick: number;
  [key: string]: unknown;
}

class TestHost extends StatefulWidget<TestHostProps, TestHostState> {
  state: TestHostState = { tick: 0 };

  bump() {
    this.setState({ tick: this.state.tick + 1 });
  }

  render() {
    const theme = this.props.theme;
    const hoveredKey = this.state.tick % 2 === 0 ? null : 'color';
    return (
      <Container key="root" width={300} height={220} pointerEvent="auto">
        <ColorPicker
          key="cp"
          widgetKey="cp"
          theme={theme}
          width={28}
          height={28}
          triggerHoverKey="color"
          dropdownTop={34}
          dropdownLeft={0}
          cols={4}
          swatchSize={22}
          gap={6}
          padding={8}
          presets={[
            { label: 'a', value: '#111' },
            { label: 'b', value: '#222' },
            { label: 'c', value: '#333' },
            { label: 'd', value: '#444' },
            { label: 'e', value: '#555' },
            { label: 'f', value: '#666' },
            { label: 'g', value: '#777' },
            { label: 'h', value: '#888' },
          ]}
          hoveredKey={hoveredKey}
          onHoverKey={() => undefined}
          swatchWidgetKey={(color: string) => `sw-${color}`}
          onPick={() => undefined}
        />
      </Container>
    );
  }
}

describe('RichTextToolbar - ColorPicker Overlay 行为', () => {
  it('打开后应通过 Overlay 渲染下拉面板，并可点击空白收起', async () => {
    const container = document.createElement('div');
    container.id = `rt-cp-ov-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { renderer: 'canvas2d' });

    try {
      const onClose = vi.fn();
      await runtime.render(
        <Container key="root" width={300} height={220} pointerEvent="auto">
          <ColorPicker
            key="cp"
            widgetKey="cp"
            theme={Themes.light}
            width={28}
            height={28}
            triggerHoverKey="color"
            dropdownTop={34}
            dropdownLeft={0}
            cols={4}
            swatchSize={22}
            gap={6}
            padding={8}
            presets={[
              { label: 'a', value: '#111' },
              { label: 'b', value: '#222' },
              { label: 'c', value: '#333' },
              { label: 'd', value: '#444' },
              { label: 'e', value: '#555' },
              { label: 'f', value: '#666' },
              { label: 'g', value: '#777' },
              { label: 'h', value: '#888' },
            ]}
            hoveredKey={null}
            onHoverKey={() => undefined}
            swatchWidgetKey={(color: string) => `sw-${color}`}
            onPick={() => undefined}
            onClose={onClose}
          />
        </Container>,
      );

      const root = runtime.getRootWidget()!;
      const cp = findWidget(root, '#cp') as any;
      cp.toggleOpened({ stopPropagation: vi.fn() } as any);
      runtime.tick();
      await new Promise((r) => setTimeout(r, 20));

      const overlayRoot1 = runtime.getOverlayRootWidget();
      expect(overlayRoot1).not.toBeNull();
      const overlayKey = `${String(cp.key)}-color-picker-overlay`;
      const dd1 = findWidget(overlayRoot1!, `#${overlayKey}-dropdown`);
      expect(dd1).not.toBeNull();

      const mask = findWidget(overlayRoot1!, `#${overlayKey}-mask`) as any;
      expect(mask).not.toBeNull();
      const p = mask.getAbsolutePosition();
      dispatchToTree(overlayRoot1!, mask, 'pointerdown', p.dx + 1, p.dy + 1);
      runtime.tick();
      await new Promise((r) => setTimeout(r, 20));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(runtime.getOverlayRootWidget()).toBeNull();
    } finally {
      runtime.destroy();
      document.body.innerHTML = '';
    }
  });

  it('打开后父组件更新不应导致自动收起', async () => {
    const container = document.createElement('div');
    container.id = `rt-cp-keep-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { renderer: 'canvas2d' });

    try {
      await runtime.render(<TestHost key="host" theme={Themes.light} />);
      const root1 = runtime.getRootWidget()!;
      const host = findWidget(root1, '#host') as TestHost;
      const cp1 = findWidget(root1, '#cp') as any;
      cp1.toggleOpened({ stopPropagation: vi.fn() } as any);
      runtime.tick();
      await new Promise((r) => setTimeout(r, 20));

      const overlayKey = `${String(cp1.key)}-color-picker-overlay`;
      const overlayRoot1 = runtime.getOverlayRootWidget()!;
      expect(findWidget(overlayRoot1, `#${overlayKey}-dropdown`)).not.toBeNull();

      host.bump();
      runtime.tick();
      await new Promise((r) => setTimeout(r, 20));

      const root2 = runtime.getRootWidget()!;
      const cp2 = findWidget(root2, '#cp') as any;
      expect(cp2).toBe(cp1);
      expect(cp2.state.opened).toBe(true);
      const overlayRoot2 = runtime.getOverlayRootWidget()!;
      expect(findWidget(overlayRoot2, `#${overlayKey}-dropdown`)).not.toBeNull();
    } finally {
      runtime.destroy();
      document.body.innerHTML = '';
    }
  });
});
