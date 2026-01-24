/** @jsxImportSource @/utils/compiler */
import { getDefaultTheme, getDefaultTokens, type CompSize } from './theme';

import type { ThemePalette } from '@/styles/theme';

import {
  ClipRect,
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  Positioned,
  Row,
  ScrollView,
  Stack,
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

export interface SelectOption<T extends string | number = string> {
  label: string;
  value: T;
  disabled?: boolean;
  key?: string;
}

export interface SelectProps<T extends string | number = string> extends WidgetProps {
  theme?: ThemePalette;
  width: number;
  size?: CompSize;
  value?: T | null;
  defaultValue?: T | null;
  options: ReadonlyArray<SelectOption<T>>;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: T) => void;
}

interface SelectState<T extends string | number> {
  opened: boolean;
  hoveredKey: string | null;
  innerValue: T | null;
  [key: string]: unknown;
}

export class Select<T extends string | number = string> extends StatefulWidget<
  SelectProps<T>,
  SelectState<T>
> {
  protected state: SelectState<T> = {
    opened: false,
    hoveredKey: null,
    innerValue: null as T | null,
  };

  protected override initWidget(data: SelectProps<T>) {
    super.initWidget(data);
    this.state.opened = false;
    this.state.hoveredKey = null;
    this.state.innerValue = null as T | null;
    if (data.defaultValue !== undefined) {
      this.state.innerValue = data.defaultValue ?? null;
    }
  }

  protected override didUpdateWidget(oldProps: SelectProps<T>): void {
    if (oldProps.value !== this.props.value && this.props.value !== undefined) {
      this.setState({ innerValue: (this.props.value ?? null) as T | null });
    }
  }

  private getValue(): T | null {
    if (this.props.value !== undefined) {
      return this.props.value ?? null;
    }
    return this.state.innerValue;
  }

  private updateValue(next: T): void {
    if (this.props.value === undefined) {
      this.setState({ innerValue: next });
    }
    this.props.onChange?.(next);
  }

  private toggleOpened = (e: InkwellEvent) => {
    if (this.props.disabled) {
      return;
    }
    e.stopPropagation?.();
    this.setState({ opened: !this.state.opened });
  };

  private closeOpened = () => {
    if (this.state.opened) {
      this.setState({ opened: false, hoveredKey: null });
    }
  };

  render() {
    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();
    const size = this.props.size ?? 'middle';
    const height = tokens.controlHeight[size];
    const fontSize = tokens.controlFontSize[size];
    const paddingX = tokens.controlPaddingX[size];
    const disabled = !!this.props.disabled;
    const value = this.getValue();
    const selectedOpt =
      value == null ? null : (this.props.options.find((o) => o.value === value) ?? null);
    const label = selectedOpt?.label ?? null;

    const triggerBg = this.state.opened ? theme.state.hover : theme.background.container;
    const triggerBorderColor = this.state.opened ? theme.primary : theme.border.base;

    const dropdownMaxH = Math.max(120, height * 6);
    const dropdownItemH = height;
    const dropdownGap = 4;
    const dropdownPadding = 6;
    const innerW = this.props.width - dropdownPadding * 2;

    return (
      <Stack allowOverflowPositioned={true}>
        <Container
          key={`${this.key}-trigger`}
          width={this.props.width}
          height={height}
          padding={{ left: paddingX, right: paddingX }}
          borderRadius={tokens.borderRadius}
          border={{
            width: tokens.borderWidth,
            color: disabled ? theme.border.base : triggerBorderColor,
          }}
          color={disabled ? theme.state.disabled : triggerBg}
          cursor={disabled ? 'not-allowed' : 'pointer'}
          alignment="center"
          pointerEvent="auto"
          onPointerDown={this.toggleOpened}
        >
          <Row
            mainAxisAlignment={MainAxisAlignment.Start}
            crossAxisAlignment={CrossAxisAlignment.Center}
          >
            <Text
              text={label ?? this.props.placeholder ?? '请选择'}
              fontSize={fontSize}
              lineHeight={height}
              color={label ? theme.text.primary : theme.text.placeholder}
              textAlignVertical={TextAlignVertical.Center}
              pointerEvent="none"
            />
          </Row>
        </Container>

        {this.state.opened ? (
          <PositionedDropdown
            widgetKey={`${this.key}-dropdown`}
            theme={theme}
            tokens={tokens}
            width={this.props.width}
            top={height + 4}
            maxHeight={dropdownMaxH}
            padding={dropdownPadding}
            itemHeight={dropdownItemH}
            itemGap={dropdownGap}
            innerWidth={innerW}
            hoveredKey={this.state.hoveredKey}
            options={this.props.options}
            onHoverKey={(k) => this.setState({ hoveredKey: k })}
            onClose={this.closeOpened}
            onSelect={(v) => {
              this.updateValue(v);
              this.closeOpened();
            }}
            disabled={disabled}
          />
        ) : null}
      </Stack>
    );
  }
}

function PositionedDropdown<T extends string | number>(props: {
  widgetKey: string;
  theme: ThemePalette;
  tokens: ReturnType<typeof getDefaultTokens>;
  width: number;
  top: number;
  maxHeight: number;
  padding: number;
  itemHeight: number;
  itemGap: number;
  innerWidth: number;
  hoveredKey: string | null;
  options: ReadonlyArray<SelectOption<T>>;
  onHoverKey: (key: string | null) => void;
  onClose: () => void;
  onSelect: (value: T) => void;
  disabled: boolean;
}) {
  const { theme, tokens } = props;
  return (
    <Positioned key={props.widgetKey} left={0} top={props.top}>
      <ClipRect borderRadius={tokens.borderRadius}>
        <Container
          width={props.width}
          borderRadius={tokens.borderRadius}
          border={{ width: tokens.borderWidth, color: theme.border.base }}
          color={theme.background.container}
          padding={[props.padding, props.padding]}
          pointerEvent="auto"
          onPointerLeave={props.onClose}
        >
          <Container width={props.innerWidth} height={props.maxHeight}>
            <ScrollView enableBounceVertical={true} enableBounceHorizontal={false}>
              <Column spacing={props.itemGap} crossAxisAlignment={CrossAxisAlignment.Start}>
                {props.options.map((opt) => {
                  const key = opt.key ?? String(opt.value);
                  const itemDisabled = props.disabled || !!opt.disabled;
                  const hovered = props.hoveredKey === key;
                  return (
                    <Container
                      key={key}
                      width={props.innerWidth}
                      height={props.itemHeight}
                      borderRadius={tokens.borderRadius}
                      color={hovered ? theme.state.hover : theme.background.container}
                      cursor={itemDisabled ? 'not-allowed' : 'pointer'}
                      alignment="center"
                      pointerEvent="auto"
                      onPointerEnter={() => {
                        if (!itemDisabled) {
                          props.onHoverKey(key);
                        }
                      }}
                      onPointerLeave={() => props.onHoverKey(null)}
                      onPointerDown={(e: InkwellEvent) => {
                        if (itemDisabled) {
                          return;
                        }
                        e.stopPropagation?.();
                        props.onSelect(opt.value);
                        props.onHoverKey(null);
                      }}
                    >
                      <Text
                        text={opt.label}
                        fontSize={12}
                        color={itemDisabled ? theme.text.placeholder : theme.text.primary}
                        textAlign={TextAlign.Left}
                        textAlignVertical={TextAlignVertical.Center}
                        pointerEvent="none"
                      />
                    </Container>
                  );
                })}
              </Column>
            </ScrollView>
          </Container>
        </Container>
      </ClipRect>
    </Positioned>
  );
}
