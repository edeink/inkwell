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
  Stack,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
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

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export class DatePicker extends StatefulWidget<DatePickerProps, DatePickerState> {
  protected state: DatePickerState = {
    opened: false,
    innerValue: null,
    viewYear: 1970,
    viewMonth: 0,
    hoverKey: null,
  };

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
  };

  private closeOpened = () => {
    if (this.state.opened) {
      this.setState({ opened: false, hoverKey: null });
    }
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
          <Text
            text={label ?? this.props.placeholder ?? '请选择日期'}
            fontSize={fontSize}
            lineHeight={height}
            color={label ? theme.text.primary : theme.text.placeholder}
            textAlignVertical={TextAlignVertical.Center}
            pointerEvent="none"
          />
        </Container>

        {this.state.opened ? (
          <Positioned key={`${this.key}-dropdown`} left={0} top={height + 4}>
            <ClipRect borderRadius={tokens.borderRadius}>
              <Container
                width={this.props.width}
                borderRadius={tokens.borderRadius}
                border={{ width: tokens.borderWidth, color: theme.border.base }}
                color={theme.background.container}
                padding={8}
                pointerEvent="auto"
                onPointerLeave={this.closeOpened}
              >
                <DatePanel
                  theme={theme}
                  tokens={tokens}
                  width={this.props.width - 16}
                  year={this.state.viewYear}
                  month={this.state.viewMonth}
                  value={value}
                  hoverKey={this.state.hoverKey}
                  onHoverKey={(k) => this.setState({ hoverKey: k })}
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
        ) : null}
      </Stack>
    );
  }
}

function DatePanel(props: {
  theme: ThemePalette;
  tokens: ReturnType<typeof getDefaultTokens>;
  width: number;
  year: number;
  month: number;
  value: Date | null;
  hoverKey: string | null;
  onHoverKey: (key: string | null) => void;
  onPrev: () => void;
  onNext: () => void;
  onPick: (d: Date) => void;
}) {
  const { theme, tokens } = props;
  const headerH = 28;
  const cellH = 28;
  const cols = 7;
  const gap = 2;
  const cellW = Math.floor((props.width - gap * (cols - 1)) / cols);

  const first = new Date(props.year, props.month, 1);
  const firstWeekDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(props.year, props.month + 1, 0).getDate();

  const cells: Array<{ key: string; date: Date; inMonth: boolean }> = [];
  const startDate = new Date(props.year, props.month, 1 - firstWeekDay);
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const inMonth = d.getMonth() === props.month;
    cells.push({ key: formatDate(d), date: d, inMonth });
  }

  const monthLabel = `${props.year}-${pad2(props.month + 1)}`;

  return (
    <Column spacing={8} crossAxisAlignment={CrossAxisAlignment.Start}>
      <Row
        mainAxisAlignment={MainAxisAlignment.SpaceBetween}
        crossAxisAlignment={CrossAxisAlignment.Center}
      >
        <Container
          width={headerH}
          height={headerH}
          borderRadius={tokens.borderRadius}
          color={theme.background.surface}
          cursor="pointer"
          alignment="center"
          pointerEvent="auto"
          onPointerDown={(e: InkwellEvent) => {
            e.stopPropagation?.();
            props.onPrev();
          }}
        >
          <Text text="‹" fontSize={16} color={theme.text.secondary} pointerEvent="none" />
        </Container>
        <Text text={monthLabel} fontSize={14} color={theme.text.primary} pointerEvent="none" />
        <Container
          width={headerH}
          height={headerH}
          borderRadius={tokens.borderRadius}
          color={theme.background.surface}
          cursor="pointer"
          alignment="center"
          pointerEvent="auto"
          onPointerDown={(e: InkwellEvent) => {
            e.stopPropagation?.();
            props.onNext();
          }}
        >
          <Text text="›" fontSize={16} color={theme.text.secondary} pointerEvent="none" />
        </Container>
      </Row>

      <Row spacing={gap} crossAxisAlignment={CrossAxisAlignment.Center}>
        {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
          <Container
            key={`w-${d}`}
            width={cellW}
            height={cellH}
            alignment="center"
            pointerEvent="none"
          >
            <Text text={d} fontSize={12} color={theme.text.secondary} pointerEvent="none" />
          </Container>
        ))}
      </Row>

      <Column spacing={gap} crossAxisAlignment={CrossAxisAlignment.Start}>
        {Array.from({ length: 6 }).map((_, row) => (
          <Row key={`r-${row}`} spacing={gap} crossAxisAlignment={CrossAxisAlignment.Center}>
            {cells.slice(row * 7, row * 7 + 7).map((cell) => {
              const selected = props.value ? isSameDay(props.value, cell.date) : false;
              const hovered = props.hoverKey === cell.key;
              const baseColor = selected
                ? theme.primary
                : hovered
                  ? theme.state.hover
                  : theme.background.container;
              const textColor = selected
                ? theme.text.inverse
                : cell.inMonth
                  ? theme.text.primary
                  : theme.text.placeholder;
              return (
                <Container
                  key={cell.key}
                  width={cellW}
                  height={cellH}
                  borderRadius={tokens.borderRadius}
                  color={baseColor}
                  cursor="pointer"
                  alignment="center"
                  pointerEvent="auto"
                  onPointerEnter={() => props.onHoverKey(cell.key)}
                  onPointerLeave={() => props.onHoverKey(null)}
                  onPointerDown={(e: InkwellEvent) => {
                    e.stopPropagation?.();
                    const day = cell.date.getDate();
                    if (cell.inMonth && day >= 1 && day <= daysInMonth) {
                      props.onPick(cell.date);
                    } else {
                      props.onPick(cell.date);
                    }
                  }}
                >
                  <Text
                    text={String(cell.date.getDate())}
                    fontSize={12}
                    color={textColor}
                    textAlign={TextAlign.Center}
                    textAlignVertical={TextAlignVertical.Center}
                    pointerEvent="none"
                  />
                </Container>
              );
            })}
          </Row>
        ))}
      </Column>
    </Column>
  );
}
