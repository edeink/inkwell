/** @jsxImportSource @/utils/compiler */
import { getDefaultTheme, getDefaultTokens, type CompSize } from './theme';

import type { ThemePalette } from '@/styles/theme';

import {
  Container,
  MainAxisAlignment,
  Row,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export type ButtonType = 'default' | 'primary' | 'dashed' | 'text' | 'link';

export interface ButtonProps extends WidgetProps {
  theme?: ThemePalette;
  btnType?: ButtonType;
  size?: CompSize;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  width?: number;
  onClick?: (e: InkwellEvent) => void;
}

interface ButtonState {
  hovered: boolean;
  active: boolean;
  [key: string]: unknown;
}

export class Button extends StatefulWidget<ButtonProps, ButtonState> {
  protected state: ButtonState = { hovered: false, active: false };

  onClick(e: InkwellEvent): void {
    if (this.props.disabled) {
      return;
    }
    this.props.onClick?.(e);
  }

  private handlePointerEnter = () => {
    if (this.props.disabled) {
      return;
    }
    this.setState({ hovered: true });
  };

  private handlePointerLeave = () => {
    if (this.state.hovered || this.state.active) {
      this.setState({ hovered: false, active: false });
    }
  };

  private handlePointerDown = (e: InkwellEvent) => {
    if (this.props.disabled) {
      return;
    }
    e.stopPropagation?.();
    this.setState({ active: true });
  };

  private handlePointerUp = () => {
    if (this.state.active) {
      this.setState({ active: false });
    }
  };

  render() {
    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();
    const size: CompSize = this.props.size ?? 'middle';
    const btnType: ButtonType = this.props.btnType ?? 'default';

    const height = tokens.controlHeight[size];
    const paddingX = tokens.controlPaddingX[size];
    const fontSize = tokens.controlFontSize[size];

    const primaryColor = this.props.danger ? theme.danger : theme.primary;
    const hovered = this.state.hovered;
    const active = this.state.active;
    const disabled = !!this.props.disabled;

    const baseBorder = { width: tokens.borderWidth, color: theme.border.base };

    let color: string | undefined;
    let border: typeof baseBorder | undefined = baseBorder;
    let textColor = theme.text.primary;

    if (btnType === 'primary') {
      color = primaryColor;
      border = { width: tokens.borderWidth, color: primaryColor };
      textColor = theme.text.inverse;
    } else if (btnType === 'text') {
      color = undefined;
      border = undefined;
      textColor = this.props.danger ? theme.danger : theme.text.primary;
    } else if (btnType === 'link') {
      color = undefined;
      border = undefined;
      textColor = primaryColor;
    } else {
      color = theme.background.container;
      border = btnType === 'dashed' ? baseBorder : baseBorder;
      textColor = this.props.danger ? theme.danger : theme.text.primary;
    }

    if (hovered && !disabled) {
      if (btnType === 'primary') {
        color = theme.state.hover;
      } else if (btnType === 'default' || btnType === 'dashed') {
        border = { width: tokens.borderWidth, color: primaryColor };
      } else {
        color = theme.state.hover;
      }
    }

    if (active && !disabled) {
      if (btnType === 'primary') {
        color = theme.state.active;
      } else {
        color = theme.state.active;
      }
    }

    if (disabled) {
      color = theme.state.disabled;
      border = baseBorder;
      textColor = theme.text.placeholder;
    }

    const loadingText = this.props.loading === true ? '加载中' : null;

    return (
      <Container
        key={this.key}
        width={this.props.width}
        height={height}
        padding={{ left: paddingX, right: paddingX }}
        color={color}
        border={border}
        borderRadius={tokens.borderRadius}
        alignment="center"
        cursor={disabled ? 'not-allowed' : 'pointer'}
        pointerEvent="auto"
        onPointerEnter={this.handlePointerEnter}
        onPointerLeave={this.handlePointerLeave}
        onPointerDown={this.handlePointerDown}
        onPointerUp={this.handlePointerUp}
      >
        <Row mainAxisAlignment={MainAxisAlignment.Center} spacing={8}>
          {loadingText ? (
            <Text
              text={loadingText}
              fontSize={fontSize}
              lineHeight={height}
              color={textColor}
              textAlign={TextAlign.Center}
              textAlignVertical={TextAlignVertical.Center}
              pointerEvent="none"
            />
          ) : null}
          {this.props.children as unknown as WidgetProps[]}
        </Row>
      </Container>
    );
  }
}
