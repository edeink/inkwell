/** @jsxImportSource @/utils/compiler */
import {
  DatePanel,
  formatDate,
  getDatePanelHeight,
  getMonthGridRowCount,
  startOfDay,
} from './date-picker-panel';
import { getDefaultTheme, getDefaultTokens, type CompSize } from './theme';

import type { ThemePalette } from '@/styles/theme';

import {
  ClipRect,
  Container,
  Positioned,
  Stack,
  StatefulWidget,
  Text,
  TextAlignVertical,
  type BuildContext,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface DatePickerProps extends WidgetProps {
  theme?: ThemePalette;
  width: number;
  size?: CompSize;
  value?: Date | null;
  defaultValue?: Date | null;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (date: Date) => void;
}

interface DatePickerState {
  opened: boolean;
  innerValue: Date | null;
  viewYear: number;
  viewMonth: number;
  hoverKey: string | null;
  [key: string]: unknown;
}

export class DatePicker extends StatefulWidget<DatePickerProps, DatePickerState> {
  protected state: DatePickerState = {
    opened: false,
    innerValue: null,
    viewYear: 1970,
    viewMonth: 0,
    hoverKey: null,
  };

  private _lastOverlayLeft: number | null = null;
  private _lastOverlayTop: number | null = null;

  protected override initWidget(data: DatePickerProps) {
    super.initWidget(data);
    const initValue = data.defaultValue ?? null;
    const base = startOfDay(initValue ?? new Date());
    this.state.opened = false;
    this.state.hoverKey = null;
    this.state.innerValue = initValue ? startOfDay(initValue) : null;
    this.state.viewYear = base.getFullYear();
    this.state.viewMonth = base.getMonth();
  }

  protected override didUpdateWidget(oldProps: DatePickerProps): void {
    if (oldProps.value !== this.props.value && this.props.value !== undefined) {
      const next = this.props.value ? startOfDay(this.props.value) : null;
      const base = startOfDay(next ?? new Date());
      this.setState({
        innerValue: next,
        viewYear: base.getFullYear(),
        viewMonth: base.getMonth(),
      });
      this.syncOverlay();
    }
  }

  private getValue(): Date | null {
    if (this.props.value !== undefined) {
      return this.props.value ? startOfDay(this.props.value) : null;
    }
    return this.state.innerValue;
  }

  private updateValue(next: Date): void {
    const v = startOfDay(next);
    if (this.props.value === undefined) {
      this.setState({ innerValue: v });
    }
    this.props.onChange?.(v);
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
      this.setState({ opened: false, hoverKey: null });
      this.syncOverlay();
    }
  };

  private setHoverKey = (k: string | null) => {
    this.setState({ hoverKey: k });
    this.syncOverlay();
  };

  private shiftMonth(delta: number) {
    const m = this.state.viewMonth + delta;
    if (m < 0) {
      this.setState({ viewMonth: 11, viewYear: this.state.viewYear - 1 });
    } else if (m > 11) {
      this.setState({ viewMonth: 0, viewYear: this.state.viewYear + 1 });
    } else {
      this.setState({ viewMonth: m });
    }
    this.syncOverlay();
  }

  private getOverlayEntryKey(): string {
    return `${String(this.key)}-date-picker-overlay`;
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
    const triggerH = tokens.controlHeight[size];
    const gapTop = 4;

    const panelW = this.props.width;
    const panelPadding = 8;
    const panelH = getDatePanelHeight(
      getMonthGridRowCount(this.state.viewYear, this.state.viewMonth),
      panelPadding,
    );

    const pos = this.getAbsolutePosition();
    const root = rt.getRootWidget();
    const viewportW = root?.renderObject.size.width ?? null;
    const viewportH = root?.renderObject.size.height ?? null;

    let left = pos.dx;
    let top = pos.dy + triggerH + gapTop;

    if (viewportW !== null) {
      left = Math.max(0, Math.min(left, viewportW - panelW));
    }

    if (viewportH !== null) {
      const belowTop = pos.dy + triggerH + gapTop;
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

    const value = this.getValue();

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
        <Positioned key={overlayKey} left={left} top={top}>
          <ClipRect borderRadius={tokens.borderRadius}>
            <Container
              width={panelW}
              borderRadius={tokens.borderRadius}
              border={{ width: tokens.borderWidth, color: theme.border.base }}
              color={theme.background.container}
              padding={panelPadding}
              pointerEvent="auto"
            >
              <DatePanel
                theme={theme}
                tokens={tokens}
                width={panelW - panelPadding * 2}
                year={this.state.viewYear}
                month={this.state.viewMonth}
                value={value}
                hoverKey={this.state.hoverKey}
                onHoverKey={this.setHoverKey}
                onPrev={() => this.shiftMonth(-1)}
                onNext={() => this.shiftMonth(1)}
                onPick={(d) => {
                  this.updateValue(d);
                  this.closeOpened();
                }}
              />
            </Container>
          </ClipRect>
        </Positioned>
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
    const triggerH = tokens.controlHeight[size];
    const gapTop = 4;

    const panelW = this.props.width;
    const panelH = getDatePanelHeight(
      getMonthGridRowCount(this.state.viewYear, this.state.viewMonth),
      8,
    );

    const pos = this.getAbsolutePosition();
    const root = this.runtime.getRootWidget();
    const viewportW = root?.renderObject.size.width ?? null;
    const viewportH = root?.renderObject.size.height ?? null;

    let left = pos.dx;
    let top = pos.dy + triggerH + gapTop;

    if (viewportW !== null) {
      left = Math.max(0, Math.min(left, viewportW - panelW));
    }

    if (viewportH !== null) {
      const belowTop = pos.dy + triggerH + gapTop;
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
    const label = value ? formatDate(value) : null;

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
        <Text
          text={label ?? this.props.placeholder ?? '请选择日期'}
          fontSize={fontSize}
          lineHeight={height}
          color={label ? theme.text.primary : theme.text.placeholder}
          textAlignVertical={TextAlignVertical.Center}
          pointerEvent="none"
        />
      </Container>
    );
  }
}
