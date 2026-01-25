/** @jsxImportSource @/utils/compiler */
import { getDefaultTheme, getDefaultTokens, type CompSize } from '../theme';

import type { ThemePalette } from '@/styles/theme';

import {
  Container,
  CrossAxisAlignment,
  Row,
  StatefulWidget,
  Text,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface RadioProps<T extends string | number = string> extends WidgetProps {
  theme?: ThemePalette;
  value: T;
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  size?: CompSize;
  onChange?: (value: T, e: InkwellEvent) => void;
}

interface RadioState {
  hovered: boolean;
  active: boolean;
  [key: string]: unknown;
}

export class Radio<T extends string | number = string> extends StatefulWidget<
  RadioProps<T>,
  RadioState
> {
  protected state: RadioState = { hovered: false, active: false };

  private handleClick = (e: InkwellEvent) => {
    if (this.props.disabled) {
      return;
    }
    e.stopPropagation?.();
    if (!this.props.checked) {
      this.props.onChange?.(this.props.value, e);
    }
  };

  render() {
    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();
    const size = this.props.size ?? 'middle';
    const fontSize = tokens.controlFontSize[size];
    const height = tokens.controlHeight[size];

    const outerSize = Math.max(14, Math.floor(height * 0.5));
    const innerSize = Math.max(6, Math.floor(outerSize * 0.5));
    const checked = !!this.props.checked;
    const disabled = !!this.props.disabled;

    const hoverBg = this.state.hovered && !disabled ? theme.state.hover : undefined;
    const textColor = disabled ? theme.text.placeholder : theme.text.primary;
    const borderColor = checked ? theme.primary : theme.border.base;

    return (
      <Container
        key={this.key}
        height={height}
        padding={{ left: 4, right: 4 }}
        borderRadius={tokens.borderRadius}
        color={hoverBg}
        cursor={disabled ? 'not-allowed' : 'pointer'}
        pointerEvent="auto"
        alignment="center"
        onPointerEnter={() => this.setState({ hovered: true })}
        onPointerLeave={() => this.setState({ hovered: false, active: false })}
        onPointerDown={() => this.setState({ active: true })}
        onPointerUp={() => this.setState({ active: false })}
        onClick={this.handleClick}
      >
        <Row spacing={8} crossAxisAlignment={CrossAxisAlignment.Center}>
          <Container
            width={outerSize}
            height={outerSize}
            borderRadius={outerSize / 2}
            border={{ width: tokens.borderWidth, color: borderColor }}
            color={disabled ? theme.state.disabled : theme.background.container}
            alignment="center"
            pointerEvent="none"
          >
            {checked ? (
              <Container
                width={innerSize}
                height={innerSize}
                borderRadius={innerSize / 2}
                color={disabled ? theme.text.placeholder : theme.primary}
                pointerEvent="none"
              />
            ) : null}
          </Container>
          {this.props.label ? (
            <Text
              text={this.props.label}
              fontSize={fontSize}
              lineHeight={height}
              color={textColor}
              textAlignVertical={TextAlignVertical.Center}
              pointerEvent="none"
            />
          ) : null}
          {this.props.children}
        </Row>
      </Container>
    );
  }
}
