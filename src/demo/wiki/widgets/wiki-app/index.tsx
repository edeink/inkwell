/** @jsxImportSource @/utils/compiler */
import { parseMarkdownFrontMatter, type SidebarItem } from '../../helpers/wiki-doc';
import { FStateWidget } from '../fstate-widget';
import { MarkdownPreview } from '../markdown-preview';
import { MarkdownParser, NodeType, type MarkdownNode } from '../markdown-preview/parser';
import { type WikiDoc, type WikiDocMeta, type WikiSidebarProps } from '../types';
import { WikiSidebar } from '../wiki-sidebar';
import { WikiToc, type MarkdownTocItem } from '../wiki-toc';

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

export class WikiApp extends FStateWidget<WikiAppProps, State> {
  private scrollView: ScrollViewHandle | null = null;
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
      ys.push(sumOffsetYUntil(anchor, root));
    }

    this.tocOffsetCacheKey = cacheKey;
    this.tocOffsetKeys = keys;
    this.tocOffsetYs = ys;
  }

  private getActiveTocKey(scrollY: number): string {
    const toc = this.cachedToc;
    if (!toc.length) {
      return '';
    }
    const root = this.contentRoot;
    const runtimeRoot = this.runtime?.getRootWidget?.() as Widget | null;
    if (!root || !runtimeRoot) {
      return '';
    }

    this.ensureTocOffsets(`${this.state.selectedKey}-${root.renderObject.size.width}`);
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
      const y = sumOffsetYUntil(anchor, root);
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
      y = sumOffsetYUntil(anchor, root);
    }
    const nextY = Math.max(0, y);
    sv.scrollTo(0, nextY);
    const nextActiveKey = this.getActiveTocKey(nextY) || anchorKey;
    this.setState({ scrollY: nextY, activeTocKey: nextActiveKey });
    this.scrollTocToActive(nextActiveKey);
  };

  private handleContentScroll = (_scrollX: number, scrollY: number) => {
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

    const doc = docs.find((d) => d.key === selectedKey) || docs[0] || null;
    if (doc) {
      this.ensureDocLoaded(doc.key);
    }
    const docMetas: WikiDocMeta[] = docs.map((d) => ({
      key: d.key,
      title: d.title,
      path: d.path,
    }));

    const sidebarProps: WikiSidebarProps = {
      type: 'WikiSidebar',
      width: sidebarWidth,
      height,
      theme,
      minWidth: SIDEBAR_MIN_WIDTH,
      maxWidth: SIDEBAR_MAX_WIDTH,
      dividerWidth: DIVIDER_WIDTH,
      sidebarItems: this.props.sidebarItems,
      docs: docMetas,
      selectedKey: selectedKey || '',
      onSelect: this.handleSelect,
      onResize: this.handleSidebarResize,
    };

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
            <WikiSidebar {...sidebarProps} />
            <Expanded flex={{ flex: 1 }}>
              <Container width={contentW} height={height} color={theme.background.surface}>
                <Padding padding={24}>
                  {this.getDocContent(doc) ? (
                    <ScrollView
                      key={`md-${doc.key}-sv`}
                      ref={this.setScrollViewRef}
                      onScroll={this.handleContentScroll}
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
            <WikiToc
              type="WikiToc"
              width={TOC_WIDTH}
              height={height}
              theme={theme}
              toc={this.getDocContent(doc) ? this.getParsedDoc(doc).toc : []}
              activeKey={this.state.activeTocKey}
              onSelect={this.scrollToAnchor}
              onRef={this.setTocScrollViewRef}
            />
          </Row>
        )}
      </Container>
    );
  }
}
