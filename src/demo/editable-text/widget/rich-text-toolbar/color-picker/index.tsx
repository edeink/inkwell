/** @jsxImportSource @/utils/compiler */
/**
 * 文件用途：RichTextToolbar 内部复用的颜色选择组件（Widget）。
 * 主要功能：展示颜色选择触发器并在组件内部管理色板面板的打开/收起。
 * 作者：InkWell 团队
 * 最后修改日期：2026-01-24
 */
import { ToolbarColorPickerDropdown } from '../toolbar-color-picker-dropdown';
import { ToolbarColorPickerTrigger } from '../toolbar-color-picker-trigger';

import type { WidgetProps } from '@/core/base';
import type { RichTextColorPreset } from '@/demo/editable-text/widget/rich-text-toolbar';
import type { ThemePalette } from '@/styles/theme';

import { Container, Stack, StatefulWidget, type BuildContext, type InkwellEvent } from '@/core';

export interface ColorPickerProps extends WidgetProps {
  widgetKey: string;
  theme: ThemePalette;
  width: number;
  height: number;
  active?: boolean;
  triggerHoverKey: string;
  dropdownTop: number;
  dropdownLeft: number;
  cols: number;
  swatchSize: number;
  gap: number;
  padding: number;
  presets: ReadonlyArray<RichTextColorPreset>;
  hoveredKey: string | null;
  onHoverKey: (key: string | null) => void;
  swatchWidgetKey: (color: string) => string;
  onPick: (color: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

interface ColorPickerState {
  opened: boolean;
  [key: string]: unknown;
}

/**
 * 颜色选择组件：在组件内部管理色板面板打开/收起，并向外透传取色与 hover 状态。
 */
export class ColorPicker extends StatefulWidget<ColorPickerProps, ColorPickerState> {
  state: ColorPickerState = {
    opened: false,
  };

  private _lastOverlayLeft: number | null = null;
  private _lastOverlayTop: number | null = null;

  /**
   * 设置打开状态；仅在状态变化时触发 setState 与回调。
   */
  private setOpened(opened: boolean) {
    if (opened === this.state.opened) {
      return;
    }
    this.setState({ opened });
    this.syncOverlay();
    if (opened) {
      this.props.onOpen?.();
    } else {
      this.props.onClose?.();
    }
  }

  /**
   * 触发器点击：切换打开状态，并阻止事件继续冒泡到父级（避免外层误处理）。
   */
  private toggleOpened = (e: InkwellEvent) => {
    e.stopPropagation?.();
    this.setOpened(!this.state.opened);
  };

  /**
   * 收起面板。
   */
  private closeOpened = () => {
    this.setOpened(false);
  };

  private getOverlayEntryKey(): string {
    return `${String(this.key)}-color-picker-overlay`;
  }

  private syncOverlay(): void {
    const rt = this.runtime;
    if (!rt) {
      return;
    }
    const overlayKey = this.getOverlayEntryKey();
    if (!this.state.opened) {
      this._lastOverlayLeft = null;
      this._lastOverlayTop = null;
      rt.removeOverlayEntry(overlayKey);
      return;
    }

    const cols = Math.max(1, this.props.cols | 0);
    const swatchSize = Math.max(1, this.props.swatchSize | 0);
    const gap = Math.max(0, this.props.gap | 0);
    const padding = Math.max(0, this.props.padding | 0);

    const panelW = padding * 2 + cols * swatchSize + Math.max(0, cols - 1) * gap;
    const rows = Math.max(1, Math.ceil(this.props.presets.length / cols));
    const panelH = padding * 2 + rows * swatchSize + Math.max(0, rows - 1) * gap;

    const triggerPos = this.getAbsolutePosition();
    const root = rt.getRootWidget();
    const viewportW = root?.renderObject.size.width ?? null;
    const viewportH = root?.renderObject.size.height ?? null;

    let left = triggerPos.dx + this.props.dropdownLeft;
    let top = triggerPos.dy + this.props.dropdownTop;

    if (viewportW !== null) {
      left = Math.max(0, Math.min(left, viewportW - panelW));
    }

    if (viewportH !== null) {
      const belowTop = triggerPos.dy + this.props.dropdownTop;
      const belowBottom = belowTop + panelH;
      const aboveTop = triggerPos.dy - 4 - panelH;
      if (belowBottom > viewportH && aboveTop >= 0) {
        top = aboveTop;
      } else {
        top = belowTop;
      }
      top = Math.max(0, Math.min(top, viewportH - panelH));
    }

    this._lastOverlayLeft = left;
    this._lastOverlayTop = top;

    rt.setOverlayEntry(
      overlayKey,
      <Stack key={`${overlayKey}-host`} allowOverflowPositioned={true}>
        <Container
          key={`${overlayKey}-mask`}
          width={viewportW ?? undefined}
          height={viewportH ?? undefined}
          alignment="topLeft"
          pointerEvent="auto"
          onPointerDown={(e: InkwellEvent) => {
            e.stopPropagation?.();
            this.closeOpened();
          }}
        />
        <ToolbarColorPickerDropdown
          widgetKey={`${overlayKey}-dropdown`}
          theme={this.props.theme}
          left={left}
          top={top}
          cols={this.props.cols}
          swatchSize={this.props.swatchSize}
          gap={this.props.gap}
          padding={this.props.padding}
          presets={this.props.presets}
          hoveredKey={this.props.hoveredKey}
          onHoverKey={this.props.onHoverKey}
          swatchWidgetKey={this.props.swatchWidgetKey}
          onPick={(color) => {
            this.props.onPick(color);
            this.props.onHoverKey(null);
            this.closeOpened();
          }}
        />
      </Stack>,
    );
  }

  override paint(context: BuildContext): void {
    super.paint(context);
    if (!this.state.opened) {
      return;
    }
    if (!this.runtime) {
      return;
    }
    const cols = Math.max(1, this.props.cols | 0);
    const swatchSize = Math.max(1, this.props.swatchSize | 0);
    const gap = Math.max(0, this.props.gap | 0);
    const padding = Math.max(0, this.props.padding | 0);

    const panelW = padding * 2 + cols * swatchSize + Math.max(0, cols - 1) * gap;
    const rows = Math.max(1, Math.ceil(this.props.presets.length / cols));
    const panelH = padding * 2 + rows * swatchSize + Math.max(0, rows - 1) * gap;

    const triggerPos = this.getAbsolutePosition();
    const root = this.runtime.getRootWidget();
    const viewportW = root?.renderObject.size.width ?? null;
    const viewportH = root?.renderObject.size.height ?? null;

    let left = triggerPos.dx + this.props.dropdownLeft;
    let top = triggerPos.dy + this.props.dropdownTop;

    if (viewportW !== null) {
      left = Math.max(0, Math.min(left, viewportW - panelW));
    }

    if (viewportH !== null) {
      const belowTop = triggerPos.dy + this.props.dropdownTop;
      const belowBottom = belowTop + panelH;
      const aboveTop = triggerPos.dy - 4 - panelH;
      if (belowBottom > viewportH && aboveTop >= 0) {
        top = aboveTop;
      } else {
        top = belowTop;
      }
      top = Math.max(0, Math.min(top, viewportH - panelH));
    }

    if (this._lastOverlayLeft !== left || this._lastOverlayTop !== top) {
      this.syncOverlay();
    }
  }

  override dispose(): void {
    const rt = this.runtime;
    if (rt) {
      rt.removeOverlayEntry(this.getOverlayEntryKey());
    }
    super.dispose();
  }

  protected render() {
    const hovered = this.props.hoveredKey === this.props.triggerHoverKey;
    const opened = this.state.opened;

    return (
      <Stack allowOverflowPositioned={true}>
        <ToolbarColorPickerTrigger
          widgetKey={this.props.widgetKey}
          theme={this.props.theme}
          width={this.props.width}
          height={this.props.height}
          active={this.props.active}
          opened={opened}
          hovered={hovered}
          onPointerEnter={() => this.props.onHoverKey(this.props.triggerHoverKey)}
          onPointerLeave={() => this.props.onHoverKey(null)}
          onPointerDown={this.toggleOpened}
        />

        {opened && !this.runtime && (
          <ToolbarColorPickerDropdown
            widgetKey={`${this.props.widgetKey}-dropdown`}
            theme={this.props.theme}
            left={this.props.dropdownLeft}
            top={this.props.dropdownTop}
            cols={this.props.cols}
            swatchSize={this.props.swatchSize}
            gap={this.props.gap}
            padding={this.props.padding}
            presets={this.props.presets}
            hoveredKey={this.props.hoveredKey}
            onHoverKey={this.props.onHoverKey}
            swatchWidgetKey={this.props.swatchWidgetKey}
            onPick={(color) => {
              this.props.onPick(color);
              this.props.onHoverKey(null);
              this.closeOpened();
            }}
          />
        )}
      </Stack>
    );
  }
}
