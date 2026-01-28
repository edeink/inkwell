/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { runApp as runEditableTextApp } from '../editable-text/app';
import { InteractiveCounterDemo } from '../interactive-counter/app';
import { MindmapDemo } from '../mindmap/app';
import { ResumeDemoApp } from '../resume/app';
import { SpreadsheetDemoApp } from '../spreadsheet/app';
import { SwiperDemoApp } from '../swiper/app';
import { WidgetGalleryDemo } from '../widget-gallery/app';

import { Widget } from '@/core/base';
import { Themes } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Demo Verification', () => {
  it.each([
    [
      'InteractiveCounterDemo',
      () => new InteractiveCounterDemo({ theme: Themes.light } as any),
      true,
    ],
    ['SwiperDemoApp', () => new SwiperDemoApp({ theme: Themes.light } as any), true],
    [
      'SpreadsheetDemoApp',
      () =>
        new SpreadsheetDemoApp({
          width: 800,
          height: 600,
          theme: Themes.light,
        } as any),
      true,
    ],
    [
      'MindmapDemo',
      () =>
        new MindmapDemo({
          width: 800,
          height: 600,
          theme: Themes.light,
        } as any),
      false,
    ],
    [
      'ResumeDemoApp',
      () =>
        new ResumeDemoApp({
          width: 800,
          height: 600,
          theme: Themes.light,
        } as any),
      true,
    ],
  ])('%s 应能正常初始化', (_name, createWidget, shouldRender) => {
    const widget = createWidget();
    expect(widget).toBeDefined();
    expect(widget).toBeInstanceOf(Widget);
    if (shouldRender) {
      const result = widget.render();
      expect(result).toBeDefined();
    }
  });

  it('WidgetGalleryDemo 应能正常渲染', () => {
    const el = WidgetGalleryDemo({ width: 800, height: 600, theme: Themes.light });
    expect(el).toBeDefined();
    const data = compileElement(el as any);
    expect(data).toHaveProperty('__inkwellType');
  });

  it.each([
    [800, 600],
    [390, 844],
    [844, 390],
    [1920, 1080],
  ])('EditableTextDemo 应使用视口宽高作为根 ScrollView 尺寸（%i×%i）', (w, h) => {
    const onRichSelectionInfo = vi.fn();
    const runtime = {
      render: vi.fn(async () => undefined),
    } as any;

    runEditableTextApp(runtime, w, h, Themes.light, onRichSelectionInfo);

    expect(runtime.render).toHaveBeenCalledTimes(1);

    const scrollViewEl = runtime.render.mock.calls[0][0] as any;
    expect(scrollViewEl).toBeTruthy();
    expect(scrollViewEl.type).toBeDefined();
    expect(scrollViewEl.props.width).toBe(w);
    expect(scrollViewEl.props.height).toBe(h);
    expect(scrollViewEl.props.enableBounceVertical).toBe(true);
    expect(scrollViewEl.props.enableBounceHorizontal).toBe(false);

    const containerEl = scrollViewEl.props.children as any;
    expect(containerEl).toBeTruthy();
    expect(containerEl.props.minWidth).toBe(w);
    expect(containerEl.props.minHeight).toBe(h);

    const demoEl = containerEl.props.children as any;
    expect(demoEl).toBeTruthy();
    expect(demoEl.props.width).toBeUndefined();
    expect(demoEl.props.height).toBeUndefined();
    expect(demoEl.props.onRichSelectionInfo).toBe(onRichSelectionInfo);
  });
});
