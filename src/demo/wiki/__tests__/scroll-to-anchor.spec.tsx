import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WikiApp } from '../widgets/wiki-app';

import { Widget } from '@/core/base';
import { Themes } from '@/styles/theme';

class TestRoot extends Widget {
  constructor() {
    super({ type: 'TestRoot', key: 'root' } as any);
  }
}

function createWikiAppForTest(opts: { viewportH: number; contentH: number }) {
  const scrollTo = vi.fn();
  const app = new WikiApp({
    type: 'WikiApp',
    width: 800,
    height: 600,
    theme: Themes.light,
    docs: [],
    loadDoc: async () => ({ content: '' }),
  } as any) as any;

  const runtimeRoot = new TestRoot() as any;
  runtimeRoot.children = [];

  app.runtime = { getRootWidget: () => runtimeRoot, scheduleUpdate: vi.fn() } as any;
  app.contentRoot = { renderObject: { size: { width: 800, height: 600 } } } as any;
  app.scrollView = { scrollTo } as any;
  app.scrollViewWidget = {
    renderObject: { size: { width: 800, height: opts.viewportH } },
    _contentSize: { width: 800, height: opts.contentH },
  } as any;
  app.cachedToc = [];
  app.tocOffsetKeys = [];
  app.tocOffsetYs = [];
  app.currentScrollY = 0;

  return { app, scrollTo, runtimeRoot };
}

describe('WikiApp scrollToAnchor', () => {
  let rafSpy: any;
  let cafSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
      return setTimeout(() => cb(Date.now()), 16) as any;
    });
    cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: any) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    rafSpy?.mockRestore?.();
    cafSpy?.mockRestore?.();
    vi.useRealTimers();
  });

  it('应平滑跳转到中间标题并最终定位到顶端', () => {
    const { app, scrollTo } = createWikiAppForTest({ viewportH: 100, contentH: 500 });
    app.tocOffsetKeys = ['a'];
    app.tocOffsetYs = [200];

    app.scrollToAnchor('a');

    vi.advanceTimersByTime(49);
    expect(scrollTo).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    const last = scrollTo.mock.calls[scrollTo.mock.calls.length - 1];
    expect(last).toEqual([0, 200]);
  });

  it('当标题靠近底部且无法顶到最上时应保持在最底部', () => {
    const { app, scrollTo } = createWikiAppForTest({ viewportH: 100, contentH: 500 });
    app.tocOffsetKeys = ['a'];
    app.tocOffsetYs = [480];

    app.scrollToAnchor('a');
    vi.advanceTimersByTime(1000);
    const last = scrollTo.mock.calls[scrollTo.mock.calls.length - 1];
    expect(last).toEqual([0, 400]);
  });

  it('当容器高度不足（内容不足以滚动）时应保持滚动为 0', () => {
    const { app, scrollTo } = createWikiAppForTest({ viewportH: 100, contentH: 80 });
    app.tocOffsetKeys = ['a'];
    app.tocOffsetYs = [30];

    app.scrollToAnchor('a');
    vi.advanceTimersByTime(1000);
    const last = scrollTo.mock.calls[scrollTo.mock.calls.length - 1];
    expect(last).toEqual([0, 0]);
  });

  it('当标题不存在时不应触发滚动', () => {
    const { app, scrollTo } = createWikiAppForTest({ viewportH: 100, contentH: 500 });
    app.tocOffsetKeys = [];
    app.tocOffsetYs = [];

    app.scrollToAnchor('not-exist');
    vi.advanceTimersByTime(1000);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('快速连续点击时应按最后一次点击目标跳转', () => {
    const { app, scrollTo } = createWikiAppForTest({ viewportH: 100, contentH: 500 });
    app.tocOffsetKeys = ['a', 'b'];
    app.tocOffsetYs = [120, 260];

    app.scrollToAnchor('a');
    vi.advanceTimersByTime(20);
    app.scrollToAnchor('b');

    vi.advanceTimersByTime(49);
    expect(scrollTo).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    const last = scrollTo.mock.calls[scrollTo.mock.calls.length - 1];
    expect(last).toEqual([0, 260]);
  });
});
