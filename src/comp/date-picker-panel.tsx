/** @jsxImportSource @/utils/compiler */
import { getDefaultTokens } from './theme';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  MainAxisSize,
  Row,
  Text,
  TextAlign,
  TextAlignVertical,
  type InkwellEvent,
} from '@/core';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getMonthGridRowCount(year: number, month: number): number {
  const first = new Date(year, month, 1);
  const firstWeekDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = firstWeekDay + daysInMonth;
  return Math.max(4, Math.min(6, Math.ceil(total / 7)));
}

export function getDatePanelHeight(rows: number, panelPadding: number): number {
  const headerH = 28;
  const cellH = 28;
  const gap = 2;
  const sectionSpacing = 8;
  const gridH = rows * cellH + Math.max(0, rows - 1) * gap;
  return panelPadding * 2 + headerH + cellH + gridH + sectionSpacing * 2;
}

export function DatePanel(props: {
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
  const rows = getMonthGridRowCount(props.year, props.month);

  const cells: Array<{ key: string; date: Date; inMonth: boolean }> = [];
  const startDate = new Date(props.year, props.month, 1 - firstWeekDay);
  for (let i = 0; i < rows * 7; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const inMonth = d.getMonth() === props.month;
    cells.push({ key: formatDate(d), date: d, inMonth });
  }

  const monthLabel = `${props.year}-${pad2(props.month + 1)}`;

  return (
    <Column
      spacing={8}
      crossAxisAlignment={CrossAxisAlignment.Start}
      mainAxisSize={MainAxisSize.Min}
    >
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

      <Column
        spacing={gap}
        crossAxisAlignment={CrossAxisAlignment.Start}
        mainAxisSize={MainAxisSize.Min}
      >
        {Array.from({ length: rows }).map((_, row) => (
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
