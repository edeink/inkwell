/** @jsxImportSource @/utils/compiler */
import { getDefaultTheme, getDefaultTokens, type CompSize } from '../theme';

import type { BoxConstraints, Size } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';
import type { JSXElement } from '@/utils/compiler/jsx-runtime';

import {
  Column,
  Container,
  CrossAxisAlignment,
  Expanded,
  Row,
  ScrollView,
  StatefulWidget,
  Text,
  TextAlignVertical,
  type WidgetProps,
} from '@/core';

export interface TableColumn<T extends Record<string, unknown> = Record<string, unknown>> {
  title: string;
  dataIndex?: keyof T & string;
  key: string;
  width?: number;
  fixed?: 'left' | 'right';
  render?: (
    value: unknown,
    record: T,
    rowIndex: number,
  ) => WidgetProps | JSXElement | string | number | null | undefined;
}

export interface TableProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> extends WidgetProps {
  theme?: ThemePalette;
  width?: number;
  height?: number;
  size?: CompSize;
  columns: ReadonlyArray<TableColumn<T>>;
  dataSource: ReadonlyArray<T>;
  rowKey?: (record: T, index: number) => string;
  bordered?: boolean;
  affixHeader?: boolean;
}

interface TableState {
  hoveredRowKey: string | null;
  hovered: boolean;
  scrollX: number;
  [key: string]: unknown;
}

function isWidgetPropsLike(v: unknown): v is WidgetProps {
  if (!v || typeof v !== 'object') {
    return false;
  }
  const r = v as Record<string, unknown>;
  return typeof r.__inkwellType === 'string';
}

function isJSXElementLike(v: unknown): v is JSXElement {
  if (!v || typeof v !== 'object') {
    return false;
  }
  const r = v as Record<string, unknown>;
  return 'type' in r && 'props' in r;
}

export class Table<
  T extends Record<string, unknown> = Record<string, unknown>,
> extends StatefulWidget<TableProps<T>, TableState> {
  protected state: TableState = { hoveredRowKey: null, hovered: false, scrollX: 0 };

  protected override initWidget(data: TableProps<T>): void {
    super.initWidget(data);
    this.zIndex = typeof data.zIndex === 'number' ? data.zIndex : 1000;
  }

  protected override didUpdateWidget(oldProps: TableProps<T>): void {
    const next = this.props.zIndex;
    if (oldProps.zIndex !== next) {
      this.zIndex = typeof next === 'number' ? next : 1000;
    }
    super.didUpdateWidget(oldProps);
  }

  protected override getConstraintsForChild(
    constraints: BoxConstraints,
    _childIndex: number,
  ): BoxConstraints {
    const boundedW = Number.isFinite(constraints.maxWidth);
    const boundedH = Number.isFinite(constraints.maxHeight);

    const w =
      typeof this.props.width === 'number'
        ? boundedW
          ? Math.min(this.props.width, constraints.maxWidth)
          : this.props.width
        : constraints.maxWidth;

    const h =
      typeof this.props.height === 'number'
        ? boundedH
          ? Math.min(this.props.height, constraints.maxHeight)
          : this.props.height
        : constraints.maxHeight;

    return {
      minWidth: Number.isFinite(w) ? w : constraints.minWidth,
      maxWidth: Number.isFinite(w) ? w : constraints.maxWidth,
      minHeight: Number.isFinite(h) ? h : constraints.minHeight,
      maxHeight: Number.isFinite(h) ? h : constraints.maxHeight,
    };
  }

  protected override performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const child = childrenSizes[0] ?? { width: 0, height: 0 };
    return {
      width: Math.max(constraints.minWidth, Math.min(child.width, constraints.maxWidth)),
      height: Math.max(constraints.minHeight, Math.min(child.height, constraints.maxHeight)),
    };
  }

  private getRowKey(record: T, index: number): string {
    if (this.props.rowKey) {
      return this.props.rowKey(record, index);
    }
    const k = record['key'];
    return typeof k === 'string' || typeof k === 'number' ? String(k) : String(index);
  }

  render() {
    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();
    const size = this.props.size ?? 'middle';
    const rowH = tokens.controlHeight[size];
    const fontSize = tokens.controlFontSize[size];
    const bordered = this.props.bordered ?? true;
    const affixHeader = this.props.affixHeader ?? true;
    const border = bordered ? { width: tokens.borderWidth, color: theme.border.base } : undefined;

    const headerBg = theme.component.headerBg;
    const headerText = theme.text.primary;
    const rowHoverBg = theme.state.hover;

    const columns = this.props.columns;
    const baseWidths = columns.map((c) => c.width ?? 160);
    const baseContentW = baseWidths.reduce((sum, w) => sum + w, 0);
    const constraintMaxW = this.renderObject.constraints?.maxWidth;
    const constraintMaxH = this.renderObject.constraints?.maxHeight;
    const boundedMaxW = Number.isFinite(constraintMaxW) ? constraintMaxW : undefined;
    const boundedMaxH = Number.isFinite(constraintMaxH) ? constraintMaxH : undefined;

    const outerW =
      typeof this.props.width === 'number'
        ? boundedMaxW === undefined
          ? this.props.width
          : Math.min(this.props.width, boundedMaxW)
        : (boundedMaxW ?? baseContentW);
    const computedWidths = baseWidths.slice();
    if (isFinite(outerW) && outerW > baseContentW && columns.length > 0) {
      const extra = outerW - baseContentW;
      const autoIdx: number[] = [];
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].width === undefined) {
          autoIdx.push(i);
        }
      }
      const targets = autoIdx.length > 0 ? autoIdx : [columns.length - 1];
      const per = extra / targets.length;
      for (let i = 0; i < targets.length; i++) {
        computedWidths[targets[i]] += per;
      }
    }
    const outerH =
      typeof this.props.height === 'number'
        ? boundedMaxH === undefined
          ? this.props.height
          : Math.min(this.props.height, boundedMaxH)
        : boundedMaxH;

    const leftIdx: number[] = [];
    const midIdx: number[] = [];
    const rightIdx: number[] = [];
    for (let i = 0; i < columns.length; i++) {
      const fixed = columns[i].fixed;
      if (fixed === 'left') {
        leftIdx.push(i);
      } else if (fixed === 'right') {
        rightIdx.push(i);
      } else {
        midIdx.push(i);
      }
    }

    let leftW = leftIdx.reduce((sum, i) => sum + computedWidths[i], 0);
    let rightW = rightIdx.reduce((sum, i) => sum + computedWidths[i], 0);
    const fixedTotalW = leftW + rightW;
    if (isFinite(outerW) && outerW > 0 && fixedTotalW > outerW && fixedTotalW > 0) {
      const ratio = outerW / fixedTotalW;
      for (let i = 0; i < leftIdx.length; i++) {
        computedWidths[leftIdx[i]] *= ratio;
      }
      for (let i = 0; i < rightIdx.length; i++) {
        computedWidths[rightIdx[i]] *= ratio;
      }
      leftW = leftIdx.reduce((sum, i) => sum + computedWidths[i], 0);
      rightW = rightIdx.reduce((sum, i) => sum + computedWidths[i], 0);
    }

    const hasFixedHeight = typeof outerH === 'number' && Number.isFinite(outerH);
    const bodyH = hasFixedHeight ? Math.max(0, outerH - (affixHeader ? rowH : 0)) : undefined;
    const bodyContentH = this.props.dataSource.length * rowH;
    const midContentW = midIdx.reduce((sum, i) => sum + computedWidths[i], 0);
    const midViewportW = isFinite(outerW) ? Math.max(0, outerW - leftW - rightW) : undefined;
    const showScrollbarX =
      typeof midViewportW === 'number' &&
      Number.isFinite(midViewportW) &&
      midContentW > midViewportW;

    const renderCell = (args: {
      record: T;
      rowIndex: number;
      colIndex: number;
      w: number;
      hovered: boolean;
    }) => {
      const col = columns[args.colIndex];
      const dataIndex = col.dataIndex;
      const raw = dataIndex ? args.record[dataIndex] : undefined;
      const content = col.render ? col.render(raw, args.record, args.rowIndex) : raw;
      const text =
        typeof content === 'string' || typeof content === 'number' ? String(content) : null;
      const child = text ? (
        <Text
          text={text}
          fontSize={fontSize}
          color={theme.text.primary}
          lineHeight={rowH}
          textAlignVertical={TextAlignVertical.Center}
          pointerEvent="none"
        />
      ) : isWidgetPropsLike(content) ? (
        (content as WidgetProps)
      ) : isJSXElementLike(content) ? (
        (content as JSXElement)
      ) : null;
      const rowKey = this.getRowKey(args.record, args.rowIndex);
      return (
        <Container
          key={`td-${rowKey}-${col.key}`}
          width={args.w}
          height={rowH}
          padding={{ left: 12, right: 12 }}
          color={args.hovered ? rowHoverBg : theme.background.container}
          border={bordered ? { width: 0, color: theme.border.base } : undefined}
          alignment="center"
          pointerEvent="auto"
          onPointerEnter={() => this.setState({ hoveredRowKey: rowKey })}
          onPointerLeave={() => this.setState({ hoveredRowKey: null })}
        >
          {child}
        </Container>
      );
    };
    const baseZIndex = typeof this.props.zIndex === 'number' ? this.props.zIndex : 1000;
    const elevatedZIndex =
      this.state.hovered || this.state.hoveredRowKey ? baseZIndex + 1 : baseZIndex;
    this.zIndex = elevatedZIndex;

    const bodyContent = (
      <Row spacing={0} crossAxisAlignment={CrossAxisAlignment.Start}>
        {leftIdx.length ? (
          <Container width={leftW}>
            <Column spacing={0} crossAxisAlignment={CrossAxisAlignment.Start}>
              {this.props.dataSource.map((record, rowIndex) => {
                const rowKey = this.getRowKey(record, rowIndex);
                const hovered = this.state.hoveredRowKey === rowKey;
                return (
                  <Row
                    key={`tr-left-${rowKey}`}
                    spacing={0}
                    crossAxisAlignment={CrossAxisAlignment.Center}
                  >
                    {leftIdx.map((colIndex) =>
                      renderCell({
                        record,
                        rowIndex,
                        colIndex,
                        w: computedWidths[colIndex],
                        hovered,
                      }),
                    )}
                  </Row>
                );
              })}
            </Column>
          </Container>
        ) : null}

        {midIdx.length ? (
          <Expanded flex={{ flex: 1 }}>
            <ScrollView
              key={`${this.key}-tbody-scroll-x`}
              height={bodyContentH}
              enableBounceVertical={false}
              enableBounceHorizontal={true}
              scrollX={this.state.scrollX}
              scrollY={0}
              alwaysShowScrollbarX={showScrollbarX}
              alwaysShowScrollbarY={false}
              scrollBarVisibilityMode="auto"
              onScroll={(scrollX) => {
                if (scrollX !== this.state.scrollX) {
                  this.setState({ scrollX });
                }
              }}
            >
              <Container width={midContentW}>
                <Column spacing={0} crossAxisAlignment={CrossAxisAlignment.Start}>
                  {this.props.dataSource.map((record, rowIndex) => {
                    const rowKey = this.getRowKey(record, rowIndex);
                    const hovered = this.state.hoveredRowKey === rowKey;
                    return (
                      <Row
                        key={`tr-mid-${rowKey}`}
                        spacing={0}
                        crossAxisAlignment={CrossAxisAlignment.Center}
                      >
                        {midIdx.map((colIndex) =>
                          renderCell({
                            record,
                            rowIndex,
                            colIndex,
                            w: computedWidths[colIndex],
                            hovered,
                          }),
                        )}
                      </Row>
                    );
                  })}
                </Column>
              </Container>
            </ScrollView>
          </Expanded>
        ) : null}

        {rightIdx.length ? (
          <Container width={rightW}>
            <Column spacing={0} crossAxisAlignment={CrossAxisAlignment.Start}>
              {this.props.dataSource.map((record, rowIndex) => {
                const rowKey = this.getRowKey(record, rowIndex);
                const hovered = this.state.hoveredRowKey === rowKey;
                return (
                  <Row
                    key={`tr-right-${rowKey}`}
                    spacing={0}
                    crossAxisAlignment={CrossAxisAlignment.Center}
                  >
                    {rightIdx.map((colIndex) =>
                      renderCell({
                        record,
                        rowIndex,
                        colIndex,
                        w: computedWidths[colIndex],
                        hovered,
                      }),
                    )}
                  </Row>
                );
              })}
            </Column>
          </Container>
        ) : null}
      </Row>
    );

    const header = (
      <Container height={rowH}>
        <Row key={`${this.key}-thead`} spacing={0} crossAxisAlignment={CrossAxisAlignment.Center}>
          {leftIdx.map((colIndex) => (
            <Container
              key={`th-${columns[colIndex].key}`}
              width={computedWidths[colIndex]}
              height={rowH}
              padding={{ left: 12, right: 12 }}
              color={headerBg}
              border={bordered ? { width: 0, color: theme.border.base } : undefined}
              alignment="center"
              pointerEvent="none"
            >
              <Text
                text={columns[colIndex].title}
                fontSize={fontSize}
                color={headerText}
                lineHeight={rowH}
                textAlignVertical={TextAlignVertical.Center}
                pointerEvent="none"
              />
            </Container>
          ))}

          {midIdx.length ? (
            <Expanded flex={{ flex: 1 }}>
              <ScrollView
                key={`${this.key}-thead-scroll-x`}
                height={rowH}
                enableBounceVertical={false}
                enableBounceHorizontal={true}
                scrollX={this.state.scrollX}
                scrollY={0}
                alwaysShowScrollbarX={showScrollbarX}
                alwaysShowScrollbarY={false}
                scrollBarVisibilityMode="hidden"
                onScroll={(scrollX) => {
                  if (scrollX !== this.state.scrollX) {
                    this.setState({ scrollX });
                  }
                }}
              >
                <Container width={midContentW}>
                  <Row spacing={0} crossAxisAlignment={CrossAxisAlignment.Center}>
                    {midIdx.map((colIndex) => (
                      <Container
                        key={`th-${columns[colIndex].key}`}
                        width={computedWidths[colIndex]}
                        height={rowH}
                        padding={{ left: 12, right: 12 }}
                        color={headerBg}
                        border={bordered ? { width: 0, color: theme.border.base } : undefined}
                        alignment="center"
                        pointerEvent="none"
                      >
                        <Text
                          text={columns[colIndex].title}
                          fontSize={fontSize}
                          color={headerText}
                          lineHeight={rowH}
                          textAlignVertical={TextAlignVertical.Center}
                          pointerEvent="none"
                        />
                      </Container>
                    ))}
                  </Row>
                </Container>
              </ScrollView>
            </Expanded>
          ) : null}

          {rightIdx.map((colIndex) => (
            <Container
              key={`th-${columns[colIndex].key}`}
              width={computedWidths[colIndex]}
              height={rowH}
              padding={{ left: 12, right: 12 }}
              color={headerBg}
              border={bordered ? { width: 0, color: theme.border.base } : undefined}
              alignment="center"
              pointerEvent="none"
            >
              <Text
                text={columns[colIndex].title}
                fontSize={fontSize}
                color={headerText}
                lineHeight={rowH}
                textAlignVertical={TextAlignVertical.Center}
                pointerEvent="none"
              />
            </Container>
          ))}
        </Row>
      </Container>
    );

    const body =
      hasFixedHeight && typeof bodyH === 'number' ? (
        <Container height={bodyH}>
          <ScrollView
            key={`${this.key}-tbody-scroll-y`}
            height={bodyH}
            enableBounceVertical={true}
            enableBounceHorizontal={false}
            alwaysShowScrollbarX={false}
            alwaysShowScrollbarY={false}
            scrollBarVisibilityMode="auto"
          >
            {affixHeader ? (
              bodyContent
            ) : (
              <Column spacing={0} crossAxisAlignment={CrossAxisAlignment.Start}>
                {header}
                {bodyContent}
              </Column>
            )}
          </ScrollView>
        </Container>
      ) : (
        bodyContent
      );

    return (
      <Container
        key={`${this.key}-root`}
        width={Number.isFinite(outerW) ? outerW : undefined}
        height={outerH}
        minHeight={hasFixedHeight ? outerH : undefined}
        alignment="topLeft"
        border={border}
        borderRadius={tokens.borderRadius}
        color={theme.background.container}
        padding={0}
        zIndex={elevatedZIndex}
        pointerEvent="auto"
        onPointerEnter={() => this.setState({ hovered: true })}
        onPointerLeave={() => this.setState({ hovered: false, hoveredRowKey: null })}
      >
        <Column spacing={0} crossAxisAlignment={CrossAxisAlignment.Start}>
          {hasFixedHeight ? (affixHeader ? header : null) : header}
          {body}
        </Column>
      </Container>
    );
  }
}
