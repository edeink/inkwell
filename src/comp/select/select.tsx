/** @jsxImportSource @/utils/compiler */
import { getDefaultTheme, getDefaultTokens, type CompSize } from '../theme';

import type { BuildContext } from '@/core/base';
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

  private _lastOverlayLeft: number | null = null;
  private _lastOverlayTop: number | null = null;

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
    this.syncOverlay();
  };

  private closeOpened = () => {
    if (this.state.opened) {
      this.setState({ opened: false, hoveredKey: null });
      this.syncOverlay();
    }
  };

  private setHoveredKey = (k: string | null) => {
    this.setState({ hoveredKey: k });
    this.syncOverlay();
  };

  private getOverlayEntryKey(): string {
    return `${String(this.key)}-dropdown-overlay`;
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

    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();
    const size = this.props.size ?? 'middle';
    const height = tokens.controlHeight[size];

    const dropdownMaxH = Math.max(120, height * 6);
    const dropdownItemH = height;
    const dropdownGap = 4;
    const dropdownPadding = 6;
    const innerW = this.props.width - dropdownPadding * 2;

    const pos = this.getAbsolutePosition();
    const root = rt.getRootWidget();
    const viewportW = root?.renderObject.size.width ?? null;
    const viewportH = root?.renderObject.size.height ?? null;

    const optionsCount = this.props.options.length;
    const contentH = optionsCount * dropdownItemH + Math.max(0, optionsCount - 1) * dropdownGap;
    const dropdownViewH = Math.min(dropdownMaxH, contentH);
    const panelH = dropdownViewH + dropdownPadding * 2;

    const gapTop = 4;

    let left = pos.dx;
    let top = pos.dy + height + gapTop;

    if (viewportW !== null) {
      left = Math.max(0, Math.min(left, viewportW - this.props.width));
    }

    if (viewportH !== null) {
      const belowTop = pos.dy + height + gapTop;
      const belowBottom = belowTop + panelH;
      const aboveTop = pos.dy - gapTop - panelH;
      if (belowBottom > viewportH && aboveTop >= 0) {
        top = aboveTop;
      } else {
        top = belowTop;
      }
    }

    this._lastOverlayLeft = left;
    this._lastOverlayTop = top;
    rt.setOverlayEntry(
      overlayKey,
      <Stack key={`${overlayKey}-host`} allowOverflowPositioned={true}>
        <Container
          key={`${overlayKey}-mask`}
          alignment="topLeft"
          pointerEvent="auto"
          onPointerDown={(e: InkwellEvent) => {
            e.stopPropagation?.();
            this.closeOpened();
          }}
        />
        <PositionedDropdown
          widgetKey={overlayKey}
          theme={theme}
          tokens={tokens}
          width={this.props.width}
          left={left}
          top={top}
          maxHeight={dropdownViewH}
          padding={dropdownPadding}
          itemHeight={dropdownItemH}
          itemGap={dropdownGap}
          innerWidth={innerW}
          hoveredKey={this.state.hoveredKey}
          options={this.props.options}
          onHoverKey={this.setHoveredKey}
          onSelect={(v) => {
            this.updateValue(v);
            this.closeOpened();
          }}
          disabled={!!this.props.disabled}
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

    const tokens = getDefaultTokens();
    const size = this.props.size ?? 'middle';
    const height = tokens.controlHeight[size];
    const pos = this.getAbsolutePosition();
    const root = this.runtime.getRootWidget();
    const viewportW = root?.renderObject.size.width ?? null;
    const viewportH = root?.renderObject.size.height ?? null;

    const dropdownMaxH = Math.max(120, height * 6);
    const dropdownItemH = height;
    const dropdownGap = 4;
    const dropdownPadding = 6;
    const optionsCount = this.props.options.length;
    const contentH = optionsCount * dropdownItemH + Math.max(0, optionsCount - 1) * dropdownGap;
    const dropdownViewH = Math.min(dropdownMaxH, contentH);
    const panelH = dropdownViewH + dropdownPadding * 2;
    const gapTop = 4;

    let left = pos.dx;
    let top = pos.dy + height + gapTop;

    if (viewportW !== null) {
      left = Math.max(0, Math.min(left, viewportW - this.props.width));
    }

    if (viewportH !== null) {
      const belowTop = pos.dy + height + gapTop;
      const belowBottom = belowTop + panelH;
      const aboveTop = pos.dy - gapTop - panelH;
      if (belowBottom > viewportH && aboveTop >= 0) {
        top = aboveTop;
      } else {
        top = belowTop;
      }
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

    return (
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
    );
  }
}

function PositionedDropdown<T extends string | number>(props: {
  widgetKey: string;
  theme: ThemePalette;
  tokens: ReturnType<typeof getDefaultTokens>;
  width: number;
  left: number;
  top: number;
  maxHeight: number;
  padding: number;
  itemHeight: number;
  itemGap: number;
  innerWidth: number;
  hoveredKey: string | null;
  options: ReadonlyArray<SelectOption<T>>;
  onHoverKey: (key: string | null) => void;
  onSelect: (value: T) => void;
  disabled: boolean;
}) {
  const { theme, tokens } = props;
  return (
    <Positioned key={props.widgetKey} left={props.left} top={props.top}>
      <ClipRect borderRadius={tokens.borderRadius}>
        <Container
          width={props.width}
          borderRadius={tokens.borderRadius}
          border={{ width: tokens.borderWidth, color: theme.border.base }}
          color={theme.background.container}
          padding={[props.padding, props.padding]}
          pointerEvent="auto"
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
