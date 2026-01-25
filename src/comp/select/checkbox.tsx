/** @jsxImportSource @/utils/compiler */
import { getDefaultTheme, getDefaultTokens, type CompSize } from '../theme';

import type { ThemePalette } from '@/styles/theme';

import {
  Container,
  CrossAxisAlignment,
  Row,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface CheckboxProps extends WidgetProps {
  theme?: ThemePalette;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  label?: string;
  size?: CompSize;
  onChange?: (checked: boolean, e: InkwellEvent) => void;
}

interface CheckboxState {
  innerChecked: boolean;
  hovered: boolean;
  active: boolean;
  [key: string]: unknown;
}

export class Checkbox extends StatefulWidget<CheckboxProps, CheckboxState> {
  protected state: CheckboxState = { innerChecked: false, hovered: false, active: false };

  protected override initWidget(data: CheckboxProps) {
    super.initWidget(data);
    this.state.innerChecked = false;
    this.state.hovered = false;
    this.state.active = false;
    if (typeof data.defaultChecked === 'boolean') {
      this.state.innerChecked = data.defaultChecked;
    }
  }

  protected override didUpdateWidget(oldProps: CheckboxProps): void {
    const next = this.props.checked;
    const prev = oldProps.checked;
    if (typeof next === 'boolean' && next !== prev) {
      this.setState({ innerChecked: next });
    }
  }

  private isChecked(): boolean {
    if (typeof this.props.checked === 'boolean') {
      return this.props.checked;
    }
    return this.state.innerChecked;
  }

  private toggle = (e: InkwellEvent) => {
    if (this.props.disabled) {
      return;
    }
    e.stopPropagation?.();
    const next = !this.isChecked();
    if (typeof this.props.checked !== 'boolean') {
      this.setState({ innerChecked: next });
    }
    this.props.onChange?.(next, e);
  };

  render() {
    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();
    const size = this.props.size ?? 'middle';
    const fontSize = tokens.controlFontSize[size];
    const height = tokens.controlHeight[size];
    const boxSize = Math.max(14, Math.floor(height * 0.5));
    const checked = this.isChecked();
    const disabled = !!this.props.disabled;

    const borderColor = checked ? theme.primary : theme.border.base;
    const boxColor = checked ? theme.primary : theme.background.container;
    const textColor = disabled ? theme.text.placeholder : theme.text.primary;

    const hoverBg = this.state.hovered && !disabled ? theme.state.hover : undefined;

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
        onClick={this.toggle}
      >
        <Row spacing={8} crossAxisAlignment={CrossAxisAlignment.Center}>
          <Container
            width={boxSize}
            height={boxSize}
            borderRadius={2}
            border={{ width: tokens.borderWidth, color: borderColor }}
            color={disabled ? theme.state.disabled : boxColor}
            alignment="center"
            pointerEvent="none"
          >
            {checked ? (
              <Text
                text="✓"
                fontSize={Math.max(10, Math.floor(boxSize * 0.8))}
                color={theme.text.inverse}
                textAlign={TextAlign.Center}
                textAlignVertical={TextAlignVertical.Center}
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
