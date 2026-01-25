/** @jsxImportSource @/utils/compiler */
import { getDefaultTheme } from '../theme';

import { Checkbox } from './checkbox';

import type { ThemePalette } from '@/styles/theme';

import { Column, CrossAxisAlignment, Row, StatefulWidget, type WidgetProps } from '@/core';

export interface CheckboxOption<T extends string | number = string> {
  label: string;
  value: T;
  disabled?: boolean;
  key?: string;
}

export interface CheckboxGroupProps<T extends string | number = string> extends WidgetProps {
  theme?: ThemePalette;
  options: ReadonlyArray<CheckboxOption<T>>;
  value?: ReadonlyArray<T>;
  defaultValue?: ReadonlyArray<T>;
  disabled?: boolean;
  direction?: 'horizontal' | 'vertical';
  onChange?: (value: T[]) => void;
}

interface CheckboxGroupState<T extends string | number> {
  innerValue: T[];
  [key: string]: unknown;
}

export class CheckboxGroup<T extends string | number = string> extends StatefulWidget<
  CheckboxGroupProps<T>,
  CheckboxGroupState<T>
> {
  protected state: CheckboxGroupState<T> = { innerValue: [] as T[] };

  protected override initWidget(data: CheckboxGroupProps<T>) {
    super.initWidget(data);
    this.state.innerValue = [] as T[];
    if (Array.isArray(data.defaultValue)) {
      this.state.innerValue = [...data.defaultValue];
    }
  }

  protected override didUpdateWidget(oldProps: CheckboxGroupProps<T>): void {
    if (oldProps.value !== this.props.value && Array.isArray(this.props.value)) {
      this.setState({ innerValue: [...this.props.value] as T[] });
    }
  }

  private getValue(): T[] {
    if (Array.isArray(this.props.value)) {
      return [...this.props.value];
    }
    return [...this.state.innerValue];
  }

  private updateValue(next: T[]): void {
    if (!Array.isArray(this.props.value)) {
      this.setState({ innerValue: next as T[] });
    }
    this.props.onChange?.(next);
  }

  render() {
    const theme = getDefaultTheme(this.props.theme);
    const direction = this.props.direction ?? 'horizontal';
    const disabled = !!this.props.disabled;
    const value = this.getValue();

    const items = this.props.options.map((opt) => (
      <Checkbox
        key={opt.key ?? String(opt.value)}
        theme={theme}
        disabled={disabled || !!opt.disabled}
        checked={value.includes(opt.value)}
        label={opt.label}
        onChange={(checked) => {
          const cur = this.getValue();
          const set = new Set(cur);
          if (checked) {
            set.add(opt.value);
          } else {
            set.delete(opt.value);
          }
          this.updateValue(Array.from(set));
        }}
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
