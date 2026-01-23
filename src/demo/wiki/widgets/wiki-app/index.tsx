/** @jsxImportSource @/utils/compiler */
import { easeSharp } from '../../../swiper/widgets/swiper/easing';
import {
  buildNavNodesFromDocs,
  buildNavNodesFromSidebarItems,
  collectToc,
  createUnifiedWikiNavPanelStyle,
  sumOffsetYUntil,
  type MarkdownTocItem,
} from '../../helpers/wiki-app';
import { parseMarkdownFrontMatter, type SidebarItem } from '../../helpers/wiki-doc';
import { FStateWidget } from '../fstate-widget';
import { MarkdownPreview } from '../markdown-preview';
import { MarkdownParser, type MarkdownNode } from '../markdown-preview/parser';
import { type WikiDoc, type WikiDocMeta } from '../types';
import { WikiNavPanel, type WikiNavNode } from '../wiki-nav-panel';

import {
  Container,
  Expanded,
  Padding,
  Row,
  ScrollView,
  Text,
  Widget,
  createExposedHandle,
  type ScrollViewHandle,
  type WidgetProps,
} from '@/core';
import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from '@/core/flex/type';
import { applyAlpha } from '@/core/helper/color';
import { findWidget } from '@/core/helper/widget-selector';
import { type ThemePalette } from '@/styles/theme';

type WikiAppProps = {
  width: number;
  height: number;
  theme: ThemePalette;
  docs: WikiDoc[];
  loadDoc: (docId: string) => Promise<{ content: string }>;
  sidebarItems?: SidebarItem[];
  initialSelectedKey?: string;
  docLinkByKey?: Record<string, string>;
} & WidgetProps;

type State = {
  selectedKey: string;
  scrollY: number;
  activeTocKey: string;
  sidebarWidth: number;
  docVersion: number;
};

const SIDEBAR_DEFAULT_WIDTH = 285;
const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 600;
const TOC_WIDTH = 285;
const DIVIDER_WIDTH = 16;

const parser = new MarkdownParser();

/**
 * 锚点跳转动画配置
 * - debounceMs: 合并快速连续点击
 * - minDurationMs/maxDurationMs: 动画时长范围
 */
type AnchorScrollConfig = {
  debounceMs: number;
  minDurationMs: number;
  maxDurationMs: number;
};

const ANCHOR_SCROLL_CONFIG: AnchorScrollConfig = {
  debounceMs: 50,
  minDurationMs: 180,
  maxDurationMs: 480,
};

export class WikiApp extends FStateWidget<WikiAppProps, State> {
  private scrollView: ScrollViewHandle | null = null;
  private scrollViewWidget: Widget | null = null;
  private tocScrollView: ScrollViewHandle | null = null;
  private contentRoot: Widget | null = null;
  private docContentCache = new Map<string, string>();
  private docLoading = new Set<string>();
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
  private anchorScrollDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private anchorScrollAnimationFrame: number | null = null;
  private anchorScrollSeq = 0;

  protected getInitialState(props: WikiAppProps): State {
    const first = props.docs[0]?.key || '';
    const initialFromProps = props.initialSelectedKey || '';
    const initial =
      initialFromProps && props.docs.some((d) => d.key === initialFromProps)
        ? initialFromProps
        : first;
    return {
      selectedKey: initial,
      scrollY: 0,
      activeTocKey: '',
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      docVersion: 0,
    };
  }

  private handleSelect = (key: string) => {
    if (key !== this.state.selectedKey) {
      this.pendingScrollReset = true;
      this.tocOffsetCacheKey = '';
      this.tocOffsetKeys = [];
      this.tocOffsetYs = [];
      this.setState({ selectedKey: key, scrollY: 0, activeTocKey: '' });
      this.ensureDocLoaded(key);
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        params.set('tab', 'wiki');
        params.set('link', this.props.docLinkByKey?.[key] || key);
        const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
        window.history.replaceState(null, '', nextUrl);
      }
    }
  };

  private ensureDocLoaded(docId: string) {
    if (!docId) {
      return;
    }
    if (this.docContentCache.has(docId)) {
      return;
    }
    if (this.docLoading.has(docId)) {
      return;
    }
    this.docLoading.add(docId);
    this.props
      .loadDoc(docId)
      .then(({ content }) => {
        this.docContentCache.set(docId, content);
      })
      .finally(() => {
        this.docLoading.delete(docId);
        this.setState({ docVersion: this.state.docVersion + 1 });
      });
  }

  private getDocContent(doc: WikiDoc): string {
    return this.docContentCache.get(doc.key) ?? doc.content;
  }

  private handleSidebarResize = (nextWidth: number) => {
    const clamped = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, nextWidth));
    if (clamped !== this.state.sidebarWidth) {
      this.setState({ sidebarWidth: clamped });
    }
  };

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

  private getParsedDoc(doc: WikiDoc) {
    const key = doc.key;
    const content = this.getDocContent(doc);
    if (this.cachedDocKey !== key || this.cachedContent !== content || !this.cachedAst) {
      const parsed = parseMarkdownFrontMatter(content);
      const ast = parser.parse(parsed.body);
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
    for (const item of this.cachedToc) {
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

  private getActiveTocKey(scrollY: number): string {
    const toc = this.cachedToc;
    if (!toc.length) {
      return '';
    }
    const root = this.contentRoot;
    const runtimeRoot = this.runtime?.getRootWidget?.() as Widget | null;
    const rootWidth = root?.renderObject?.size?.width ?? 0;
    if (!root || !runtimeRoot || !Number.isFinite(rootWidth) || rootWidth <= 0) {
      return '';
    }

    this.ensureTocOffsets(`${this.state.selectedKey}-${rootWidth}`);
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
    const idx = this.cachedToc.findIndex((t) => t.key === activeKey);
    if (idx < 0) {
      return;
    }
    const itemPitch = 30;
    const target = Math.max(0, idx * itemPitch - 120);
    sv.scrollTo(0, target);
  }

  private cancelAnchorScroll() {
    if (this.anchorScrollDebounceTimer) {
      clearTimeout(this.anchorScrollDebounceTimer);
      this.anchorScrollDebounceTimer = null;
    }
    if (this.anchorScrollAnimationFrame) {
      cancelAnimationFrame(this.anchorScrollAnimationFrame);
      this.anchorScrollAnimationFrame = null;
    }
    this.anchorScrollSeq++;
  }

  private getMaxScrollY(): number {
    type ScrollViewSizeInfo = {
      renderObject?: { size?: { height?: number } };
      _contentSize?: { height?: number };
    };
    const svWidget = this.scrollViewWidget as unknown as ScrollViewSizeInfo | null;
    const viewportH = svWidget?.renderObject?.size?.height ?? 0;
    const contentH = svWidget?._contentSize?.height ?? 0;
    if (
      !Number.isFinite(viewportH) ||
      !Number.isFinite(contentH) ||
      viewportH <= 0 ||
      contentH <= 0
    ) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.max(0, contentH - viewportH);
  }

  private computeAnchorTargetY(rawY: number): number {
    const maxScrollY = this.getMaxScrollY();
    const y = Math.max(0, rawY);
    return Math.min(y, maxScrollY);
  }

  private startAnchorScroll(anchorKey: string, targetY: number, seq: number) {
    const sv = this.scrollView;
    if (!sv || seq !== this.anchorScrollSeq) {
      return;
    }

    const from = Number.isFinite(this.currentScrollY) ? this.currentScrollY : 0;
    const to = this.computeAnchorTargetY(targetY);
    const distance = Math.abs(to - from);
    const durationMs = Math.max(
      ANCHOR_SCROLL_CONFIG.minDurationMs,
      Math.min(ANCHOR_SCROLL_CONFIG.maxDurationMs, distance * 0.6),
    );

    if (distance < 0.5 || durationMs <= 0) {
      sv.scrollTo(0, to);
      this.currentScrollY = to;
      const nextActiveKey = this.getActiveTocKey(to) || anchorKey;
      this.setState({ scrollY: to, activeTocKey: nextActiveKey });
      this.scrollTocToActive(nextActiveKey);
      return;
    }

    const startedAt = Date.now();
    const tick = () => {
      if (seq !== this.anchorScrollSeq) {
        return;
      }
      const t = (Date.now() - startedAt) / durationMs;
      if (t >= 1) {
        sv.scrollTo(0, to);
        this.currentScrollY = to;
        const nextActiveKey = this.getActiveTocKey(to) || anchorKey;
        this.setState({ scrollY: to, activeTocKey: nextActiveKey });
        this.scrollTocToActive(nextActiveKey);
        this.anchorScrollAnimationFrame = null;
        return;
      }
      const p = easeSharp(Math.max(0, Math.min(1, t)));
      const y = from + (to - from) * p;
      sv.scrollTo(0, y);
      this.currentScrollY = y;
      this.anchorScrollAnimationFrame = requestAnimationFrame(tick);
    };

    if (this.anchorScrollAnimationFrame) {
      cancelAnimationFrame(this.anchorScrollAnimationFrame);
      this.anchorScrollAnimationFrame = null;
    }
    this.anchorScrollAnimationFrame = requestAnimationFrame(tick);
  }

  private scrollToAnchor = (anchorKey: string) => {
    const root = this.contentRoot;
    const sv = this.scrollView;
    const runtimeRoot = this.runtime?.getRootWidget?.() as Widget | null;
    if (!root || !sv || !runtimeRoot) {
      return;
    }
    this.cancelAnchorScroll();
    const idx = this.tocOffsetKeys.indexOf(anchorKey);
    let y = idx >= 0 ? this.tocOffsetYs[idx] : -1;
    if (y < 0) {
      const anchor = findWidget(runtimeRoot, `#${anchorKey}`) as Widget | null;
      if (!anchor) {
        return;
      }
      y = this.getAnchorScrollY(anchor);
    }
    const seq = this.anchorScrollSeq;
    this.anchorScrollDebounceTimer = setTimeout(() => {
      this.anchorScrollDebounceTimer = null;
      this.startAnchorScroll(anchorKey, y, seq);
    }, ANCHOR_SCROLL_CONFIG.debounceMs);
  };

  private handleContentScroll = (_scrollX: number, scrollY: number) => {
    this.currentScrollY = scrollY;
    const nextActiveKey = this.getActiveTocKey(scrollY);
    if (nextActiveKey !== this.state.activeTocKey) {
      this.setState({ activeTocKey: nextActiveKey });
      this.scrollTocToActive(nextActiveKey);
    }
  };

  render() {
    const { width, height, theme, docs } = this.props;
    const { selectedKey } = this.state;
    const sidebarWidth = this.state.sidebarWidth;
    const contentW = Math.max(0, width - sidebarWidth - DIVIDER_WIDTH - TOC_WIDTH);
    const navStyleBase = createUnifiedWikiNavPanelStyle(theme);
    const sidebarStyle = navStyleBase;
    const scrollBarTrackColor = applyAlpha(theme.text.primary, 0.06);
    const scrollBarColor = applyAlpha(theme.text.primary, 0.22);
    const scrollBarHoverColor = applyAlpha(theme.text.primary, 0.32);
    const scrollBarActiveColor = applyAlpha(theme.text.primary, 0.44);

    const doc = docs.find((d) => d.key === selectedKey) || docs[0] || null;
    if (doc) {
      this.ensureDocLoaded(doc.key);
    }
    const docMetas: WikiDocMeta[] = docs.map((d) => ({
      key: d.key,
      title: d.title,
      path: d.path,
    }));
    const sidebarNodes =
      this.props.sidebarItems && this.props.sidebarItems.length
        ? buildNavNodesFromSidebarItems(this.props.sidebarItems, docMetas)
        : buildNavNodesFromDocs(docMetas);
    const tocNodes: WikiNavNode[] = this.getDocContent(doc)
      ? this.getParsedDoc(doc).toc.map((item) => ({
          key: item.key,
          text: item.text,
          indentLevel: Math.max(0, item.level - 1),
        }))
      : [];

    return (
      <Container width={width} height={height} color={theme.background.surface}>
        {!doc ? (
          <Container width={width} height={height} alignment="center">
            <Text text="未选择文档" fontSize={14} color={theme.text.secondary} />
          </Container>
        ) : (
          <Row
            width={width}
            height={height}
            mainAxisSize={MainAxisSize.Max}
            mainAxisAlignment={MainAxisAlignment.Start}
            crossAxisAlignment={CrossAxisAlignment.Stretch}
          >
            <WikiNavPanel
              width={sidebarWidth + DIVIDER_WIDTH}
              height={height}
              theme={theme}
              nodes={sidebarNodes}
              activeKey={selectedKey || ''}
              onSelect={this.handleSelect}
              style={sidebarStyle}
              resize={{
                dividerWidth: DIVIDER_WIDTH,
                minWidth: SIDEBAR_MIN_WIDTH,
                maxWidth: SIDEBAR_MAX_WIDTH,
                onResize: this.handleSidebarResize,
              }}
            />
            <Expanded flex={{ flex: 1 }}>
              <Container width={contentW} height={height} color={theme.background.surface}>
                <Padding padding={24}>
                  {this.getDocContent(doc) ? (
                    <ScrollView
                      key={`md-${doc.key}-sv`}
                      ref={this.setScrollViewRef}
                      onScroll={this.handleContentScroll}
                      scrollBarTrackColor={scrollBarTrackColor}
                      scrollBarColor={scrollBarColor}
                      scrollBarHoverColor={scrollBarHoverColor}
                      scrollBarActiveColor={scrollBarActiveColor}
                    >
                      <Row
                        mainAxisSize={MainAxisSize.Max}
                        mainAxisAlignment={MainAxisAlignment.Center}
                        crossAxisAlignment={CrossAxisAlignment.Start}
                      >
                        <Container
                          width={Math.min(Math.max(0, contentW - 24 * 2 - 20 * 2), 900)}
                          color={theme.background.container}
                          borderRadius={8}
                          margin={{ bottom: 28 }}
                        >
                          <Padding padding={20}>
                            <Container ref={(r: unknown) => (this.contentRoot = r as Widget)}>
                              <MarkdownPreview
                                key={`md-${doc.key}`}
                                theme={theme}
                                content={this.getDocContent(doc)}
                                ast={this.getParsedDoc(doc).ast}
                                headerKeyPrefix={this.getParsedDoc(doc).tocKeyPrefix}
                              />
                            </Container>
                          </Padding>
                        </Container>
                      </Row>
                    </ScrollView>
                  ) : (
                    <Container
                      width={contentW}
                      height={Math.max(0, height - 24 * 2)}
                      alignment="center"
                      color={theme.background.surface}
                    >
                      <Text text="正在加载文档" fontSize={14} color={theme.text.secondary} />
                    </Container>
                  )}
                </Padding>
              </Container>
            </Expanded>
            <WikiNavPanel
              width={TOC_WIDTH}
              height={height}
              theme={theme}
              nodes={tocNodes}
              title="目录"
              titleGap={10}
              activeKey={this.state.activeTocKey}
              onSelect={this.scrollToAnchor}
              scrollRef={this.setTocScrollViewRef}
              style={navStyleBase}
              leadingDividerWidth={1}
              leadingDividerColor={theme.border.base}
            />
          </Row>
        )}
      </Container>
    );
  }
}
