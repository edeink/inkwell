/** @jsxImportSource @/utils/compiler */
import { clamp, getDefaultTheme, getDefaultTokens, type CompSize } from '../theme';

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
import { Overflow } from '@/core/text';

export interface PaginationProps extends WidgetProps {
  theme?: ThemePalette;
  size?: CompSize;
  current?: number;
  defaultCurrent?: number;
  pageSize?: number;
  total: number;
  onChange?: (page: number) => void;
}

interface PaginationState {
  innerCurrent: number;
  hoveredPage: number | null;
  [key: string]: unknown;
}

function buildPageItems(totalPages: number, current: number): Array<number | '...'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: Array<number | '...'> = [];
  const push = (v: number | '...') => items.push(v);
  push(1);
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);
  if (left > 2) {
    push('...');
  }
  for (let p = left; p <= right; p++) {
    push(p);
  }
  if (right < totalPages - 1) {
    push('...');
  }
  push(totalPages);
  return items;
}

export class Pagination extends StatefulWidget<PaginationProps, PaginationState> {
  protected state: PaginationState = { innerCurrent: 1, hoveredPage: null };

  protected override initWidget(data: PaginationProps) {
    super.initWidget(data);
    this.state.hoveredPage = null;
    this.state.innerCurrent = data.defaultCurrent ?? 1;
  }

  protected override didUpdateWidget(oldProps: PaginationProps): void {
    if (oldProps.current !== this.props.current && typeof this.props.current === 'number') {
      this.setState({ innerCurrent: this.props.current });
    }
  }

  private getCurrent(): number {
    return typeof this.props.current === 'number' ? this.props.current : this.state.innerCurrent;
  }

  private setCurrent(page: number) {
    const pageSize = this.props.pageSize ?? 10;
    const totalPages = Math.max(1, Math.ceil(this.props.total / pageSize));
    const next = clamp(page, 1, totalPages);
    if (typeof this.props.current !== 'number') {
      this.setState({ innerCurrent: next });
    }
    this.props.onChange?.(next);
  }

  render() {
    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();
    const size = this.props.size ?? 'middle';
    const height = tokens.controlHeight[size];
    const fontSize = tokens.controlFontSize[size];
    const pageSize = this.props.pageSize ?? 10;
    const totalPages = Math.max(1, Math.ceil(this.props.total / pageSize));
    const current = clamp(this.getCurrent(), 1, totalPages);
    const items = buildPageItems(totalPages, current);

    const itemW = Math.max(height, 32);
    const navW = Math.max(itemW, fontSize * 3 + 32);

    return (
      <Row key={this.key} spacing={8} crossAxisAlignment={CrossAxisAlignment.Center}>
        <PagerItem
          widgetKey={`${this.key}-prev`}
          theme={theme}
          tokens={tokens}
          width={navW}
          height={height}
          fontSize={fontSize}
          label="上一页"
          disabled={current <= 1}
          onClick={() => this.setCurrent(current - 1)}
        />

        {items.map((it, idx) =>
          it === '...' ? (
            <Container
              key={`ellipsis-${idx}`}
              width={itemW}
              height={height}
              alignment="center"
              pointerEvent="none"
            >
              <Text text="…" fontSize={fontSize} color={theme.text.secondary} pointerEvent="none" />
            </Container>
          ) : (
            <PagerItem
              widgetKey={`${this.key}-p-${it}`}
              theme={theme}
              tokens={tokens}
              width={itemW}
              height={height}
              fontSize={fontSize}
              active={it === current}
              label={String(it)}
              onClick={() => this.setCurrent(it)}
            />
          ),
        )}

        <PagerItem
          widgetKey={`${this.key}-next`}
          theme={theme}
          tokens={tokens}
          width={navW}
          height={height}
          fontSize={fontSize}
          label="下一页"
          disabled={current >= totalPages}
          onClick={() => this.setCurrent(current + 1)}
        />
      </Row>
    );
  }
}

function PagerItem(props: {
  widgetKey: string;
  theme: ThemePalette;
  tokens: ReturnType<typeof getDefaultTokens>;
  width: number;
  height: number;
  fontSize: number;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const active = !!props.active;
  const disabled = !!props.disabled;
  const borderColor = active ? props.theme.primary : props.theme.border.base;
  const bg = active ? props.theme.primary : props.theme.background.container;
  const textColor = active
    ? props.theme.text.inverse
    : disabled
      ? props.theme.text.placeholder
      : props.theme.text.primary;
  return (
    <Container
      key={props.widgetKey}
      width={props.width}
      height={props.height}
      padding={{ left: 8, right: 8 }}
      borderRadius={props.tokens.borderRadius}
      border={{ width: props.tokens.borderWidth, color: borderColor }}
      color={disabled ? props.theme.state.disabled : bg}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      alignment="center"
      pointerEvent="auto"
      onPointerDown={(e: InkwellEvent) => {
        if (disabled) {
          return;
        }
        e.stopPropagation?.();
        props.onClick?.();
      }}
    >
      <Text
        text={props.label}
        fontSize={props.fontSize}
        lineHeight={props.height}
        color={textColor}
        textAlignVertical={TextAlignVertical.Center}
        maxLines={1}
        overflow={Overflow.Ellipsis}
        pointerEvent="none"
      />
    </Container>
  );
}
