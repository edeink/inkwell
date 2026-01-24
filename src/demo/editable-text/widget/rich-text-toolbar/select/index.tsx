/** @jsxImportSource @/utils/compiler */
/**
 * 文件用途：RichTextToolbar 内部复用的下拉选择组件（Widget）。
 * 主要功能：展示触发器并在组件内部管理下拉面板的打开/收起。
 * 作者：InkWell 团队
 * 最后修改日期：2026-01-24
 */
import { toolbarConstants } from '../constants';

import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import {
  ClipRect,
  Column,
  Container,
  CrossAxisAlignment,
  Positioned,
  ScrollView,
  Stack,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
  type InkwellEvent,
} from '@/core';

export interface SelectOption<T extends number | string> {
  label: string;
  value: T;
  hoverKey: string;
  widgetKey: string;
}

export interface SelectProps<T extends number | string> extends WidgetProps {
  widgetKey: string;
  theme: ThemePalette;
  width: number;
  height: number;
  label: string;
  triggerHoverKey: string;
  options: ReadonlyArray<SelectOption<T>>;
  onSelect: (value: T) => void;
  dropdownTop: number;
  viewportHeight: number;
  itemHeight: number;
  itemGap: number;
  hoveredKey: string | null;
  onHoverKey: (key: string | null) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

interface SelectState {
  opened: boolean;
  [key: string]: unknown;
}

/**
 * 下拉选择组件：在组件内部管理面板的打开/收起，并通过 onOpen/onClose 通知外部。
 */
export class Select<T extends number | string> extends StatefulWidget<SelectProps<T>, SelectState> {
  state: SelectState = {
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
    const { theme, hoveredKey } = this.props;
    const { opened } = this.state;

    const backgroundColor = opened
      ? theme.state.hover
      : hoveredKey === this.props.triggerHoverKey
        ? theme.state.hover
        : theme.background.container;

    const innerW = this.props.width - toolbarConstants.selectDropdownPadding * 2;

    return (
      <Stack allowOverflowPositioned={true}>
        <Container
          key={`${this.props.widgetKey}-trigger`}
          width={this.props.width}
          height={this.props.height}
          borderRadius={toolbarConstants.triggerRadius}
          border={{ color: theme.border.base, width: 1 }}
          color={backgroundColor}
          cursor="pointer"
          alignment="center"
          pointerEvent="auto"
          onPointerEnter={() => this.props.onHoverKey(this.props.triggerHoverKey)}
          onPointerLeave={() => this.props.onHoverKey(null)}
          onPointerDown={this.toggleOpened}
        >
          <Text
            text={this.props.label}
            fontSize={12}
            color={theme.text.primary}
            textAlign={TextAlign.Center}
            textAlignVertical={TextAlignVertical.Center}
            pointerEvent="none"
          />
        </Container>

        {opened && (
          <Positioned
            key={`${this.props.widgetKey}-dropdown`}
            left={0}
            top={this.props.dropdownTop}
          >
            <ClipRect borderRadius={toolbarConstants.toolbarRadius}>
              <Container
                width={this.props.width}
                borderRadius={toolbarConstants.toolbarRadius}
                border={{ color: theme.border.base, width: 1 }}
                color={theme.background.container}
                padding={[
                  toolbarConstants.selectDropdownPadding,
                  toolbarConstants.selectDropdownPadding,
                ]}
                pointerEvent="auto"
                onPointerLeave={this.closeOpened}
              >
                <Container width={innerW} height={this.props.viewportHeight}>
                  <ScrollView
                    enableBounceVertical={true}
                    enableBounceHorizontal={false}
                    alwaysShowScrollbarY={false}
                    scrollBarVisibilityMode="auto"
                  >
                    <Column
                      spacing={this.props.itemGap}
                      crossAxisAlignment={CrossAxisAlignment.Start}
                    >
                      {this.props.options.map((opt) => (
                        <Container
                          key={opt.widgetKey}
                          width={innerW}
                          height={this.props.itemHeight}
                          borderRadius={toolbarConstants.triggerRadius}
                          color={
                            hoveredKey === opt.hoverKey
                              ? theme.state.hover
                              : theme.background.container
                          }
                          cursor="pointer"
                          alignment="center"
                          pointerEvent="auto"
                          onPointerEnter={() => this.props.onHoverKey(opt.hoverKey)}
                          onPointerLeave={() => this.props.onHoverKey(null)}
                          onPointerDown={(e: InkwellEvent) => {
                            e.stopPropagation?.();
                            this.props.onSelect(opt.value);
                            this.props.onHoverKey(null);
                            this.closeOpened();
                          }}
                        >
                          <Text
                            text={opt.label}
                            fontSize={12}
                            color={theme.text.primary}
                            textAlign={TextAlign.Center}
                            textAlignVertical={TextAlignVertical.Center}
                            pointerEvent="none"
                          />
                        </Container>
                      ))}
                    </Column>
                  </ScrollView>
                </Container>
              </Container>
            </ClipRect>
          </Positioned>
        )}
      </Stack>
    );
  }
}
