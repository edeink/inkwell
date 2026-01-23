/** @jsxImportSource @/utils/compiler */
import { createUnifiedWikiNavPanelStyle } from '../../helpers/wiki-app';
import { FStateWidget } from '../fstate-widget';
import { MarkdownPreview } from '../markdown-preview';
import { MarkdownParser, NodeType, type MarkdownNode } from '../markdown-preview/parser';
import { WikiNavPanel, type WikiNavNode } from '../wiki-nav-panel';

import type { WikiContentProps } from '../types';

import {
  Container,
  Expanded,
  Padding,
  Positioned,
  Row,
  ScrollView,
  SizedBox,
  Stack,
  Text,
  Widget,
  createExposedHandle,
  type ScrollViewHandle,
} from '@/core';
import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from '@/core/flex/type';
import { applyAlpha } from '@/core/helper/color';
import { findWidget } from '@/core/helper/widget-selector';

type State = {
  docKey: string;
  scrollY: number;
  activeTocKey: string;
  tocOpen: boolean;
};

type MarkdownTocItem = {
  key: string;
  text: string;
  level: number;
};

type StopPropagationEvent = {
  stopPropagation?: () => void;
};

const parser = new MarkdownParser();

function collectToc(ast: MarkdownNode, keyPrefix: string): MarkdownTocItem[] {
  const out: MarkdownTocItem[] = [];
  let idx = 0;
  for (const node of ast.children ?? []) {
    if (node.type !== NodeType.Header) {
      continue;
    }
    const level = node.level ?? 1;
    const text = node.children?.map((c) => c.content || '').join('') || '';
    out.push({ key: `${keyPrefix}-${idx++}`, text, level });
  }
  return out;
}

function sumOffsetYUntil(widget: Widget, stopAt: Widget): number {
  let cur: Widget | null = widget;
  let y = 0;
  while (cur && cur !== stopAt) {
    y += cur.renderObject.offset.dy || 0;
    cur = cur.parent as Widget | null;
  }
  return y;
}

export class WikiContent extends FStateWidget<WikiContentProps, State> {
  private scrollView: ScrollViewHandle | null = null;
  private scrollViewWidget: Widget | null = null;
  private tocScrollView: ScrollViewHandle | null = null;
  private contentRoot: Widget | null = null;
  private latestToc: MarkdownTocItem[] = [];
  private cachedDocKey = '';
  private cachedContent = '';
  private cachedAst: MarkdownNode | null = null;
  private cachedToc: MarkdownTocItem[] = [];
  private cachedTocKeyPrefix = '';
  private tocOffsetCacheKey = '';
  private tocOffsetKeys: string[] = [];
  private tocOffsetYs: number[] = [];
  private pendingScrollReset = false;
  private currentScrollY = 0;

  protected getInitialState(): State {
    const key = this.props.doc?.key ?? '';
    return { docKey: key, scrollY: 0, activeTocKey: '', tocOpen: false };
  }

  protected override didUpdateWidget(oldProps: WikiContentProps): void {
    const prevKey = oldProps.doc?.key ?? '';
    const nextKey = this.props.doc?.key ?? '';
    if (prevKey !== nextKey) {
      this.setState({ docKey: nextKey, scrollY: 0, activeTocKey: '', tocOpen: false });
      this.pendingScrollReset = true;
      this.tocOffsetCacheKey = '';
      this.tocOffsetKeys = [];
      this.tocOffsetYs = [];
    }
  }

  private setScrollViewRef = (r: unknown) => {
    this.scrollView = createExposedHandle<ScrollViewHandle>(r);
    this.scrollViewWidget = r as Widget;
    if (this.scrollView && this.pendingScrollReset) {
      this.pendingScrollReset = false;
      this.scrollView.scrollTo(0, 0);
    }
  };

  private setTocScrollViewRef = (r: unknown) => {
    this.tocScrollView = createExposedHandle<ScrollViewHandle>(r);
    if (this.tocScrollView && this.state.activeTocKey) {
      this.scrollTocToActive(this.state.activeTocKey);
    }
  };

  private getParsedDoc(doc: NonNullable<WikiContentProps['doc']>) {
    const key = doc.key;
    const content = doc.content;
    if (this.cachedDocKey !== key || this.cachedContent !== content || !this.cachedAst) {
      const ast = parser.parse(content);
      const tocKeyPrefix = `md-${key}-h`;
      const toc = collectToc(ast, tocKeyPrefix);

      this.cachedDocKey = key;
      this.cachedContent = content;
      this.cachedAst = ast;
      this.cachedTocKeyPrefix = tocKeyPrefix;
      this.cachedToc = toc;
      this.tocOffsetCacheKey = '';
      this.tocOffsetKeys = [];
      this.tocOffsetYs = [];
    }
    return { ast: this.cachedAst, toc: this.cachedToc, tocKeyPrefix: this.cachedTocKeyPrefix };
  }

  private ensureTocOffsets(cacheKey: string) {
    if (this.tocOffsetCacheKey === cacheKey && this.tocOffsetKeys.length) {
      return;
    }
    const root = this.contentRoot;
    const runtimeRoot = this.runtime?.getRootWidget?.() as Widget | null;
    if (!root || !runtimeRoot) {
      return;
    }

    const keys: string[] = [];
    const ys: number[] = [];
    for (const item of this.latestToc) {
      const anchor = findWidget(runtimeRoot, `#${item.key}`) as Widget | null;
      if (!anchor) {
        continue;
      }
      keys.push(item.key);
      ys.push(this.getAnchorScrollY(anchor));
    }

    this.tocOffsetCacheKey = cacheKey;
    this.tocOffsetKeys = keys;
    this.tocOffsetYs = ys;
  }

  private getAnchorScrollY(anchor: Widget): number {
    const svWidget = this.scrollViewWidget;
    const contentRoot = this.contentRoot;
    if (svWidget) {
      return sumOffsetYUntil(anchor, svWidget) + this.currentScrollY;
    }
    if (contentRoot) {
      return sumOffsetYUntil(anchor, contentRoot);
    }
    return 0;
  }

  private scrollToAnchor = (anchorKey: string) => {
    const root = this.contentRoot;
    const sv = this.scrollView;
    const runtimeRoot = this.runtime?.getRootWidget?.() as Widget | null;
    if (!root || !sv || !runtimeRoot) {
      return;
    }
    const idx = this.tocOffsetKeys.indexOf(anchorKey);
    let y = idx >= 0 ? this.tocOffsetYs[idx] : -1;
    if (y < 0) {
      const anchor = findWidget(runtimeRoot, `#${anchorKey}`) as Widget | null;
      if (!anchor) {
        return;
      }
      y = this.getAnchorScrollY(anchor);
    }
    const nextY = Math.max(0, y);
    sv.scrollTo(0, nextY);
    this.currentScrollY = nextY;
    const nextActiveKey = this.getActiveTocKey(nextY) || anchorKey;
    this.setState({ scrollY: nextY, activeTocKey: nextActiveKey });
    this.scrollTocToActive(nextActiveKey);
  };

  private handleScroll = (_scrollX: number, scrollY: number) => {
    this.currentScrollY = scrollY;
    const nextActiveKey = this.getActiveTocKey(scrollY);
    if (nextActiveKey !== this.state.activeTocKey) {
      this.setState({ activeTocKey: nextActiveKey });
      this.scrollTocToActive(nextActiveKey);
    }
  };

  private getActiveTocKey(scrollY: number): string {
    const toc = this.latestToc;
    if (!toc.length) {
      return '';
    }
    const root = this.contentRoot;
    const runtimeRoot = this.runtime?.getRootWidget?.() as Widget | null;
    if (!root || !runtimeRoot) {
      return '';
    }

    this.ensureTocOffsets(`${this.state.docKey}-${root.renderObject.size.width}`);
    if (this.tocOffsetYs.length) {
      const targetY = Math.max(0, scrollY + 12);
      let lo = 0;
      let hi = this.tocOffsetYs.length - 1;
      let ans = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (this.tocOffsetYs[mid] <= targetY) {
          ans = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return ans >= 0 ? this.tocOffsetKeys[ans] : '';
    }

    const targetY = Math.max(0, scrollY + 12);
    let activeKey = '';
    for (const item of toc) {
      const anchor = findWidget(runtimeRoot, `#${item.key}`) as Widget | null;
      if (!anchor) {
        continue;
      }
      const y = this.getAnchorScrollY(anchor);
      if (y <= targetY) {
        activeKey = item.key;
      } else {
        break;
      }
    }
    return activeKey;
  }

  private scrollTocToActive(activeKey: string) {
    if (!activeKey) {
      return;
    }
    const sv = this.tocScrollView;
    if (!sv) {
      return;
    }
    const idx = this.latestToc.findIndex((t) => t.key === activeKey);
    if (idx < 0) {
      return;
    }
    const itemPitch = 30;
    const target = Math.max(0, idx * itemPitch - 120);
    sv.scrollTo(0, target);
  }

  render() {
    const { width, height, theme, doc } = this.props;
    if (!doc) {
      return (
        <Container
          width={width}
          height={height}
          color={theme.background.surface}
          alignment="center"
        >
          <Text text="未选择文档" fontSize={14} color={theme.text.secondary} />
        </Container>
      );
    }

    const outerPadding = 24;
    const columnGap = 16;

    const contentPadding = 20;
    const contentMaxWidth = 900;
    const effectiveWidth = width ?? 0;
    const effectiveHeight = height ?? 0;
    const innerWidth = Math.max(0, effectiveWidth - outerPadding * 2);
    const innerHeight = Math.max(0, effectiveHeight - outerPadding * 2);

    const { ast, toc, tocKeyPrefix } = this.getParsedDoc(doc);
    this.latestToc = toc;
    const navStyleBase = createUnifiedWikiNavPanelStyle(theme);
    const tocPanelStyle = {
      ...navStyleBase,
      scrollBarWidth: 4,
      containerColor: theme.background.container,
      borderRadius: 8,
    };

    const showToc = toc.length > 0 && innerWidth >= 720;
    const leftFlex = 7;
    const rightFlex = 3;
    const contentAreaWidth = showToc
      ? Math.max(0, (innerWidth - columnGap) * (leftFlex / (leftFlex + rightFlex)))
      : innerWidth;

    const containerWidth = Math.min(
      Math.max(0, contentAreaWidth - contentPadding * 2),
      contentMaxWidth,
    );
    const scrollBarTrackColor = applyAlpha(theme.text.primary, 0.06);
    const scrollBarColor = applyAlpha(theme.text.primary, 0.22);
    const scrollBarHoverColor = applyAlpha(theme.text.primary, 0.32);
    const scrollBarActiveColor = applyAlpha(theme.text.primary, 0.44);

    const contentTree = (
      <ScrollView
        key={`md-${doc.key}-sv`}
        ref={this.setScrollViewRef}
        onScroll={this.handleScroll}
        scrollBarTrackColor={scrollBarTrackColor}
        scrollBarColor={scrollBarColor}
        scrollBarHoverColor={scrollBarHoverColor}
        scrollBarActiveColor={scrollBarActiveColor}
      >
        <Row mainAxisSize={MainAxisSize.Max} mainAxisAlignment={MainAxisAlignment.Center}>
          <Container
            width={containerWidth}
            color={theme.background.container}
            borderRadius={8}
            margin={{ bottom: 28 }}
          >
            <Padding padding={contentPadding}>
              <Container ref={(r: unknown) => (this.contentRoot = r as Widget)}>
                <MarkdownPreview
                  key={`md-${doc.key}`}
                  theme={theme}
                  content={doc.content}
                  ast={ast}
                  headerKeyPrefix={tocKeyPrefix}
                />
              </Container>
            </Padding>
          </Container>
        </Row>
      </ScrollView>
    );

    const tocNodes: WikiNavNode[] = toc.map((item) => ({
      key: item.key,
      text: item.text,
      indentLevel: Math.max(0, item.level - 1),
    }));

    const tocPanel = (
      <WikiNavPanel
        height={innerHeight || undefined}
        theme={theme}
        nodes={tocNodes}
        title="目录"
        titleGap={8}
        activeKey={this.state.activeTocKey}
        onSelect={this.scrollToAnchor}
        scrollRef={this.setTocScrollViewRef}
        style={tocPanelStyle}
        border={{ width: 1, color: theme.border.base }}
      />
    );

    const showOverlayTocButton = toc.length > 0 && !showToc;
    const overlayWidth = Math.min(280, innerWidth);
    const overlayHeight = Math.min(360, innerHeight);

    const overlayTocPanel = (
      <WikiNavPanel
        width={overlayWidth}
        height={overlayHeight}
        theme={theme}
        nodes={tocNodes}
        title="目录"
        titleGap={8}
        activeKey={this.state.activeTocKey}
        headerRight={
          <Container
            padding={{ left: 8, right: 8, top: 2, bottom: 2 }}
            borderRadius={6}
            color={theme.background.base}
            cursor="pointer"
            onClick={() => this.setState({ tocOpen: false })}
          >
            <Text text="关闭" fontSize={14} color={theme.text.secondary} />
          </Container>
        }
        onSelect={(key) => {
          this.scrollToAnchor(key);
          this.setState({ tocOpen: false });
        }}
        scrollRef={this.setTocScrollViewRef}
        style={tocPanelStyle}
        border={{ width: 1, color: theme.border.base }}
      />
    );

    const twoColumn = (
      <Row
        width={innerWidth}
        height={innerHeight}
        mainAxisSize={MainAxisSize.Max}
        mainAxisAlignment={MainAxisAlignment.Start}
        crossAxisAlignment={CrossAxisAlignment.Stretch}
      >
        <Expanded flex={{ flex: leftFlex }}>{contentTree}</Expanded>
        <SizedBox width={columnGap} />
        <Expanded flex={{ flex: rightFlex }}>{tocPanel}</Expanded>
      </Row>
    );

    const oneColumn = (
      <Row
        width={innerWidth}
        height={innerHeight}
        mainAxisSize={MainAxisSize.Max}
        mainAxisAlignment={MainAxisAlignment.Start}
        crossAxisAlignment={CrossAxisAlignment.Stretch}
      >
        <Expanded flex={{ flex: 1 }}>{contentTree}</Expanded>
      </Row>
    );

    const mainLayout = showToc ? twoColumn : oneColumn;

    const overlayLayout = showOverlayTocButton ? (
      <SizedBox width={innerWidth} height={innerHeight}>
        <Stack alignment="center">
          {mainLayout}
          <Positioned right={0} top={0}>
            <Container
              padding={{ left: 10, right: 10, top: 6, bottom: 6 }}
              borderRadius={8}
              color={theme.background.container}
              border={{ width: 1, color: theme.border.base }}
              cursor="pointer"
              onClick={() => this.setState({ tocOpen: !this.state.tocOpen })}
            >
              <Text text="目录" fontSize={14} color={theme.text.secondary} />
            </Container>
          </Positioned>

          {this.state.tocOpen ? (
            <Positioned left={0} top={0} width={innerWidth} height={innerHeight}>
              <Container
                width={innerWidth}
                height={innerHeight}
                color="transparent"
                onClick={() => this.setState({ tocOpen: false })}
              />
            </Positioned>
          ) : (
            <Container />
          )}

          {this.state.tocOpen ? (
            <Positioned right={0} top={0}>
              <Container onClick={(e: StopPropagationEvent) => e.stopPropagation?.()}>
                {overlayTocPanel}
              </Container>
            </Positioned>
          ) : (
            <Container />
          )}
        </Stack>
      </SizedBox>
    ) : (
      mainLayout
    );

    return (
      <Container width={width} height={height} color={theme.background.surface}>
        <Padding padding={outerPadding}>{overlayLayout}</Padding>
      </Container>
    );
  }
}
