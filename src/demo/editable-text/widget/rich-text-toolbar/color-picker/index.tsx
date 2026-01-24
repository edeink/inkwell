/** @jsxImportSource @/utils/compiler */
/**
 * 文件用途：RichTextToolbar 内部复用的颜色选择组件（Widget）。
 * 主要功能：展示颜色选择触发器并在组件内部管理色板面板的打开/收起。
 * 作者：InkWell 团队
 * 最后修改日期：2026-01-24
 */
import { ToolbarColorPickerDropdown } from '../toolbar-color-picker-dropdown';
import { ToolbarColorPickerTrigger } from '../toolbar-color-picker-trigger';

import type { RichTextColorPreset } from '../index';
import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Stack, StatefulWidget, type InkwellEvent } from '@/core';

export interface ColorPickerProps extends WidgetProps {
  widgetKey: string;
  theme: ThemePalette;
  width: number;
  height: number;
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

  /**
   * 设置打开状态；仅在状态变化时触发 setState 与回调。
   */
  private setOpened(opened: boolean) {
    if (opened === this.state.opened) {
      return;
    }
    this.setState({ opened });
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
          opened={opened}
          hovered={hovered}
          onPointerEnter={() => this.props.onHoverKey(this.props.triggerHoverKey)}
          onPointerLeave={() => this.props.onHoverKey(null)}
          onPointerDown={this.toggleOpened}
        />

        {opened && (
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
            onPointerLeave={this.closeOpened}
          />
        )}
      </Stack>
    );
  }
}
