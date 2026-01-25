/** @jsxImportSource @/utils/compiler */
import { getDefaultTheme } from '../theme';

import { Radio } from './radio';

import type { ThemePalette } from '@/styles/theme';

import { Column, CrossAxisAlignment, Row, StatefulWidget, type WidgetProps } from '@/core';

export interface RadioOption<T extends string | number = string> {
  label: string;
  value: T;
  disabled?: boolean;
  key?: string;
}

export interface RadioGroupProps<T extends string | number = string> extends WidgetProps {
  theme?: ThemePalette;
  options: ReadonlyArray<RadioOption<T>>;
  value?: T;
  defaultValue?: T;
  disabled?: boolean;
  direction?: 'horizontal' | 'vertical';
  onChange?: (value: T) => void;
}

interface RadioGroupState<T extends string | number> {
  innerValue: T | null;
  [key: string]: unknown;
}

export class RadioGroup<T extends string | number = string> extends StatefulWidget<
  RadioGroupProps<T>,
  RadioGroupState<T>
> {
  protected state: RadioGroupState<T> = { innerValue: null as T | null };

  protected override initWidget(data: RadioGroupProps<T>) {
    super.initWidget(data);
    this.state.innerValue = null as T | null;
    if (data.defaultValue !== undefined) {
      this.state.innerValue = data.defaultValue;
    }
  }

  protected override didUpdateWidget(oldProps: RadioGroupProps<T>): void {
    if (oldProps.value !== this.props.value && this.props.value !== undefined) {
      this.setState({ innerValue: this.props.value as T });
    }
  }

  private getValue(): T | null {
    if (this.props.value !== undefined) {
      return this.props.value;
    }
    return this.state.innerValue;
  }

  private updateValue(next: T): void {
    if (this.props.value === undefined) {
      this.setState({ innerValue: next as T });
    }
    this.props.onChange?.(next);
  }

  render() {
    const theme = getDefaultTheme(this.props.theme);
    const direction = this.props.direction ?? 'horizontal';
    const disabled = !!this.props.disabled;
    const value = this.getValue();

    const items = this.props.options.map((opt) => (
      <Radio
        key={opt.key ?? String(opt.value)}
        theme={theme}
        value={opt.value}
        checked={value === opt.value}
        disabled={disabled || !!opt.disabled}
        label={opt.label}
        onChange={(v) => this.updateValue(v)}
      />
    ));

    return direction === 'vertical' ? (
      <Column key={this.key} spacing={8} crossAxisAlignment={CrossAxisAlignment.Start}>
        {items}
      </Column>
    ) : (
      <Row key={this.key} spacing={12} crossAxisAlignment={CrossAxisAlignment.Center}>
        {items}
      </Row>
    );
  }
}
