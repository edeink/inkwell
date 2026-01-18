/** @jsxImportSource @/utils/compiler */
import { FStateWidget } from '../fstate-widget';

import type { InkwellEvent } from '@/core/events';
import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  Expanded,
  Padding,
  Row,
  ScrollView,
  Text,
  type WidgetProps,
} from '@/core';
import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from '@/core/flex/type';

export type WikiNavNode = {
  key: string;
  text: string;
  children?: WikiNavNode[];
  indentLevel?: number;
  defaultExpanded?: boolean;
};

type State = {
  expanded: Set<string>;
};

export type WikiNavPanelProps = {
  width?: number;
  height?: number;
  theme: ThemePalette;
  nodes: WikiNavNode[];
  title?: string;
  titleGap?: number;
  headerRight?: unknown;
  activeKey?: string;
  onSelect?: (key: string) => void;
  scrollRef?: WidgetProps['ref'];
  scrollBarWidth?: number;
  scrollBarColor?: string;
  padding?: number;
  containerColor?: string;
  borderRadius?: number;
  border?: { width: number; color: string };
  rowHeight?: number;
  rowGap?: number;
  rowRadius?: number;
  basePaddingLeft?: number;
  basePaddingRight?: number;
  indentWidth?: number;
  leafIndentOffset?: number;
  activeRowColor?: string;
  inactiveRowColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
  getRowStyle?: (
    node: WikiNavNode,
    opts: { active: boolean; isDir: boolean; depth: number },
  ) => {
    backgroundColor: string;
    textColor: string;
  };
  isNodeExpandable?: (node: WikiNavNode, depth: number) => boolean;
  isNodeSelectable?: (node: WikiNavNode, depth: number) => boolean;
  leadingDividerWidth?: number;
  leadingDividerColor?: string;
  resize?: {
    dividerWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    onResize: (width: number) => void;
  };
  initialExpandedKeys?: Iterable<string>;
} & WidgetProps;

type FlatNode = {
  node: WikiNavNode;
  depth: number;
  indentLevel: number;
  isDir: boolean;
  isToggleableDir: boolean;
  isOpen: boolean;
};

function collectInitialExpandedKeys(props: WikiNavPanelProps): Set<string> {
  const out = new Set<string>();
  if (props.initialExpandedKeys) {
    for (const k of props.initialExpandedKeys) {
      out.add(k);
    }
  }
  const isExpandable = props.isNodeExpandable ?? ((node: WikiNavNode) => !!node.children?.length);
  const walk = (nodes: WikiNavNode[], depth: number) => {
    for (const n of nodes) {
      if (n.children?.length && n.defaultExpanded && isExpandable(n, depth)) {
        out.add(n.key);
      }
      if (n.children?.length) {
        walk(n.children, depth + 1);
      }
    }
  };
  walk(props.nodes, 0);
  return out;
}

function flattenNodes(props: WikiNavPanelProps, expanded: Set<string>): FlatNode[] {
  const out: FlatNode[] = [];
  const isExpandable = props.isNodeExpandable ?? ((node: WikiNavNode) => !!node.children?.length);

  const walk = (nodes: WikiNavNode[], depth: number) => {
    for (const n of nodes) {
      const isDir = !!n.children?.length;
      const isToggleableDir = isDir && isExpandable(n, depth);
      const isOpen = isToggleableDir ? expanded.has(n.key) : true;
      const indentLevel = typeof n.indentLevel === 'number' ? n.indentLevel : depth;
      out.push({ node: n, depth, indentLevel, isDir, isToggleableDir, isOpen });
      if (isDir && isOpen) {
        walk(n.children!, depth + 1);
      }
    }
  };

  walk(props.nodes, 0);
  return out;
}

export class WikiNavPanel extends FStateWidget<WikiNavPanelProps, State> {
  private dragging = false;
  private startClientX = 0;
  private startWidth = 0;
  private activePointerId: number | null = null;

  private windowMoveHandler: ((ev: PointerEvent) => void) | null = null;
  private windowUpHandler: ((ev: PointerEvent) => void) | null = null;

  protected getInitialState(props: WikiNavPanelProps): State {
    return { expanded: collectInitialExpandedKeys(props) };
  }

  private toggleDir(key: string) {
    const next = new Set(this.state.expanded);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.setState({ expanded: next });
  }

  private attachWindowPointerListeners(native?: Event): void {
    const pe = native as PointerEvent | undefined;
    this.activePointerId = typeof pe?.pointerId === 'number' ? pe.pointerId : null;
    if (!this.windowMoveHandler) {
      this.windowMoveHandler = (ev: PointerEvent) => {
        if (!this.dragging) {
          return;
        }
        if (this.activePointerId != null && ev.pointerId !== this.activePointerId) {
          return;
        }
        if (!this.props.resize) {
          return;
        }
        const onResize = this.props.resize.onResize;
        const minWidth = this.props.resize.minWidth ?? 240;
        const maxWidth = this.props.resize.maxWidth ?? 600;
        const dx = ev.clientX - this.startClientX;
        const next = Math.max(minWidth, Math.min(maxWidth, this.startWidth + dx));
        onResize(next);
      };
    }
    if (!this.windowUpHandler) {
      this.windowUpHandler = (ev: PointerEvent) => {
        if (this.activePointerId != null && ev.pointerId !== this.activePointerId) {
          return;
        }
        this.dragging = false;
        this.detachWindowPointerListeners();
      };
    }
    window.addEventListener('pointermove', this.windowMoveHandler as EventListener, {
      capture: true,
    });
    window.addEventListener('pointerup', this.windowUpHandler as EventListener, {
      capture: true,
    });
  }

  private detachWindowPointerListeners(): void {
    if (this.windowMoveHandler) {
      window.removeEventListener('pointermove', this.windowMoveHandler as EventListener, {
        capture: true,
      });
    }
    if (this.windowUpHandler) {
      window.removeEventListener('pointerup', this.windowUpHandler as EventListener, {
        capture: true,
      });
    }
    this.windowMoveHandler = null;
    this.windowUpHandler = null;
    this.activePointerId = null;
  }

  override dispose(): void {
    this.detachWindowPointerListeners();
    super.dispose();
  }

  private onDividerPointerDown(e: InkwellEvent) {
    if (!this.props.resize) {
      return false;
    }
    this.dragging = true;
    this.startWidth = this.props.width ?? 0;
    this.startClientX = (e.nativeEvent as PointerEvent).clientX || 0;
    this.attachWindowPointerListeners(e.nativeEvent as Event);
    e.stopPropagation?.();
    return false;
  }

  render() {
    const {
      width,
      height,
      theme,
      title,
      titleGap,
      headerRight,
      activeKey,
      onSelect,
      scrollRef,
      scrollBarWidth,
      scrollBarColor,
      padding,
      containerColor,
      borderRadius,
      border,
      rowHeight,
      rowGap,
      rowRadius,
      basePaddingLeft,
      basePaddingRight,
      indentWidth,
      leafIndentOffset,
      activeRowColor,
      inactiveRowColor,
      activeTextColor,
      inactiveTextColor,
      getRowStyle,
      isNodeSelectable,
      leadingDividerWidth,
      leadingDividerColor,
      resize,
    } = this.props;

    const contentPadding = padding ?? 12;
    const listRowHeight = rowHeight ?? 28;
    const listRowGap = rowGap ?? 6;
    const listRowRadius = rowRadius ?? 6;
    const leftPadBase = basePaddingLeft ?? 8;
    const rightPadBase = basePaddingRight ?? 8;
    const indentW = indentWidth ?? 12;
    const leafExtra = leafIndentOffset ?? 0;

    const header =
      title || headerRight ? (
        <Row
          height={24}
          mainAxisSize={MainAxisSize.Max}
          mainAxisAlignment={MainAxisAlignment.Start}
          crossAxisAlignment={CrossAxisAlignment.Center}
        >
          <Expanded flex={{ flex: 1 }}>
            <Text text={title ?? ''} fontSize={14} fontWeight="bold" color={theme.text.primary} />
          </Expanded>
          {headerRight}
        </Row>
      ) : (
        <Container />
      );

    const flat = flattenNodes(this.props as unknown as WikiNavPanelProps, this.state.expanded);

    const shouldSelect =
      isNodeSelectable ??
      ((node: WikiNavNode, _depth: number) => {
        const isDir = !!node.children?.length;
        return !isDir;
      });

    const leadingW = leadingDividerWidth ?? 0;
    const resizeHandleW = resize ? (resize.dividerWidth ?? 16) : 0;
    const availableW =
      typeof width === 'number' ? Math.max(0, width - leadingW - resizeHandleW) : undefined;
    const rowWidth =
      typeof availableW === 'number' ? Math.max(0, availableW - contentPadding * 2) : undefined;

    const list = (
      <Column
        mainAxisSize={MainAxisSize.Max}
        spacing={title || headerRight ? (titleGap ?? 10) : 0}
        crossAxisAlignment={CrossAxisAlignment.Stretch}
      >
        {title || headerRight ? header : <Container />}
        <Expanded flex={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            scrollBarWidth={scrollBarWidth ?? 6}
            scrollBarColor={scrollBarColor ?? theme.text.secondary}
          >
            <Column mainAxisSize={MainAxisSize.Min} spacing={listRowGap}>
              {flat.map((f) => {
                const active = !!activeKey && f.node.key === activeKey;
                const style = getRowStyle
                  ? getRowStyle(f.node, { active, isDir: f.isDir, depth: f.depth })
                  : {
                      backgroundColor: active
                        ? (activeRowColor ?? theme.state.selected)
                        : (inactiveRowColor ?? 'transparent'),
                      textColor: active
                        ? (activeTextColor ?? theme.text.primary)
                        : (inactiveTextColor ?? theme.text.secondary),
                    };

                const padLeft =
                  leftPadBase + Math.max(0, f.indentLevel) * indentW + (f.isDir ? 0 : leafExtra);
                const padRight = rightPadBase;

                const dirMark = f.isDir && f.isToggleableDir ? (f.isOpen ? '▾ ' : '▸ ') : '';
                const text = `${dirMark}${f.node.text}`;

                const onClick = () => {
                  if (f.isDir && f.isToggleableDir) {
                    this.toggleDir(f.node.key);
                    return;
                  }
                  if (onSelect && shouldSelect(f.node, f.depth)) {
                    onSelect(f.node.key);
                  }
                };

                return (
                  <Container
                    key={f.node.key}
                    width={rowWidth}
                    height={listRowHeight}
                    padding={{ left: padLeft, right: padRight }}
                    borderRadius={listRowRadius}
                    color={style.backgroundColor}
                    cursor="pointer"
                    onClick={onClick}
                  >
                    <Row
                      height={listRowHeight}
                      mainAxisSize={MainAxisSize.Max}
                      mainAxisAlignment={MainAxisAlignment.Start}
                      crossAxisAlignment={CrossAxisAlignment.Center}
                    >
                      <Text text={text} fontSize={14} color={style.textColor} />
                    </Row>
                  </Container>
                );
              })}
            </Column>
          </ScrollView>
        </Expanded>
      </Column>
    );

    const listWithPadding = <Padding padding={contentPadding}>{list}</Padding>;

    const content =
      leadingW > 0 || resizeHandleW > 0 ? (
        <Row width={width} height={height} crossAxisAlignment={CrossAxisAlignment.Stretch}>
          {leadingW > 0 ? (
            <Container
              width={leadingW}
              height={height}
              color={leadingDividerColor ?? theme.border.base}
              pointerEvent="none"
            />
          ) : (
            <Container />
          )}
          <Expanded flex={{ flex: 1 }}>{listWithPadding}</Expanded>
          {resize ? (
            <Container
              width={resizeHandleW}
              height={height}
              cursor="col-resize"
              color="transparent"
              onPointerDown={this.onDividerPointerDown.bind(this)}
            >
              <Row
                width={resizeHandleW}
                height={height}
                mainAxisSize={MainAxisSize.Max}
                mainAxisAlignment={MainAxisAlignment.Start}
                crossAxisAlignment={CrossAxisAlignment.Center}
              >
                <Container
                  width={1}
                  height={height}
                  color={theme.border.base}
                  pointerEvent="none"
                />
              </Row>
            </Container>
          ) : (
            <Container />
          )}
        </Row>
      ) : (
        listWithPadding
      );

    return (
      <Container
        width={width}
        height={height}
        color={containerColor ?? theme.background.surface}
        borderRadius={borderRadius}
        border={border}
      >
        {content}
      </Container>
    );
  }
}
