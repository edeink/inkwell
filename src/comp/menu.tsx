/** @jsxImportSource @/utils/compiler */
import { getDefaultTheme, getDefaultTokens } from './theme';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  CrossAxisAlignment,
  Row,
  StatefulWidget,
  Text,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface MenuItem {
  key: string;
  label: string;
  disabled?: boolean;
}

export interface MenuProps extends WidgetProps {
  theme?: ThemePalette;
  mode?: 'vertical' | 'horizontal';
  width?: number;
  itemWidth?: number;
  itemHeight?: number;
  items: ReadonlyArray<MenuItem>;
  selectedKeys?: ReadonlyArray<string>;
  defaultSelectedKeys?: ReadonlyArray<string>;
  onSelect?: (key: string) => void;
}

interface MenuState {
  hoveredKey: string | null;
  innerSelectedKeys: string[];
  [key: string]: unknown;
}

export class Menu extends StatefulWidget<MenuProps, MenuState> {
  protected state: MenuState = { hoveredKey: null, innerSelectedKeys: [] };

  protected override initWidget(data: MenuProps) {
    super.initWidget(data);
    this.state.hoveredKey = null;
    this.state.innerSelectedKeys = [];
    if (Array.isArray(data.defaultSelectedKeys)) {
      this.state.innerSelectedKeys = [...data.defaultSelectedKeys];
    }
  }

  protected override didUpdateWidget(oldProps: MenuProps): void {
    if (
      oldProps.selectedKeys !== this.props.selectedKeys &&
      Array.isArray(this.props.selectedKeys)
    ) {
      this.setState({ innerSelectedKeys: [...this.props.selectedKeys] });
    }
  }

  private getSelectedKeys(): string[] {
    if (Array.isArray(this.props.selectedKeys)) {
      return [...this.props.selectedKeys];
    }
    return [...this.state.innerSelectedKeys];
  }

  private selectKey(key: string): void {
    if (!Array.isArray(this.props.selectedKeys)) {
      this.setState({ innerSelectedKeys: [key] });
    }
    this.props.onSelect?.(key);
  }

  render() {
    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();
    const mode = this.props.mode ?? 'vertical';
    const itemHeight = this.props.itemHeight ?? 40;
    const itemWidth = this.props.itemWidth ?? 160;
    const selectedKeys = this.getSelectedKeys();

    const root =
      mode === 'vertical' ? (
        <Column spacing={0} crossAxisAlignment={CrossAxisAlignment.Start}>
          {this.props.items.map((item) => {
            const selected = selectedKeys.includes(item.key);
            const hovered = this.state.hoveredKey === item.key;
            const disabled = !!item.disabled;
            const color = selected
              ? theme.state.selected
              : hovered
                ? theme.state.hover
                : theme.background.container;
            const textColor = disabled
              ? theme.text.placeholder
              : selected
                ? theme.primary
                : theme.text.primary;
            const leftBorder = selected ? theme.primary : undefined;
            return (
              <Container
                key={`menu-item-${item.key}`}
                width={this.props.width ?? itemWidth}
                height={itemHeight}
                padding={{ left: 12, right: 12 }}
                color={color}
                border={leftBorder ? { width: 1, color: leftBorder } : undefined}
                borderRadius={tokens.borderRadius}
                cursor={disabled ? 'not-allowed' : 'pointer'}
                alignment="center"
                pointerEvent="auto"
                onPointerEnter={() => this.setState({ hoveredKey: item.key })}
                onPointerLeave={() => this.setState({ hoveredKey: null })}
                onPointerDown={(e: InkwellEvent) => {
                  if (disabled) {
                    return;
                  }
                  e.stopPropagation?.();
                  this.selectKey(item.key);
                }}
              >
                <Row spacing={8} crossAxisAlignment={CrossAxisAlignment.Center}>
                  <Text
                    text={item.label}
                    fontSize={14}
                    color={textColor}
                    lineHeight={itemHeight}
                    textAlignVertical={TextAlignVertical.Center}
                    pointerEvent="none"
                  />
                </Row>
              </Container>
            );
          })}
        </Column>
      ) : (
        <Row spacing={4} crossAxisAlignment={CrossAxisAlignment.Center}>
          {this.props.items.map((item) => {
            const selected = selectedKeys.includes(item.key);
            const hovered = this.state.hoveredKey === item.key;
            const disabled = !!item.disabled;
            const color = selected
              ? theme.state.selected
              : hovered
                ? theme.state.hover
                : theme.background.container;
            const textColor = disabled
              ? theme.text.placeholder
              : selected
                ? theme.primary
                : theme.text.primary;
            return (
              <Container
                key={`menu-item-${item.key}`}
                width={itemWidth}
                height={itemHeight}
                padding={{ left: 12, right: 12 }}
                color={color}
                borderRadius={tokens.borderRadius}
                cursor={disabled ? 'not-allowed' : 'pointer'}
                alignment="center"
                pointerEvent="auto"
                onPointerEnter={() => this.setState({ hoveredKey: item.key })}
                onPointerLeave={() => this.setState({ hoveredKey: null })}
                onPointerDown={(e: InkwellEvent) => {
                  if (disabled) {
                    return;
                  }
                  e.stopPropagation?.();
                  this.selectKey(item.key);
                }}
              >
                <Text
                  text={item.label}
                  fontSize={14}
                  color={textColor}
                  lineHeight={itemHeight}
                  textAlignVertical={TextAlignVertical.Center}
                  pointerEvent="none"
                />
              </Container>
            );
          })}
        </Row>
      );

    return (
      <Container
        key={this.key}
        width={this.props.width}
        color={theme.background.container}
        border={{ width: tokens.borderWidth, color: theme.border.base }}
        borderRadius={tokens.borderRadius}
        padding={4}
      >
        {root}
      </Container>
    );
  }
}
