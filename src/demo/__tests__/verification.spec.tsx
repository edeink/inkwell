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

describe('Demo Verification', () => {
  it('InteractiveCounterDemo 应能正常渲染', () => {
    const widget = new InteractiveCounterDemo({
      theme: Themes.light,
      type: 'InteractiveCounterDemo',
    } as any);
    expect(widget).toBeDefined();
    expect(widget).toBeInstanceOf(Widget);
    const result = widget.render();
    expect(result).toBeDefined();
  });

  it('WidgetGalleryDemo 应能正常渲染', () => {
    const result = WidgetGalleryDemo({ width: 800, height: 600, theme: Themes.light });
    expect(result).toBeDefined();
    // 函数组件会返回 ComponentData 对象
    expect(result).toHaveProperty('type');
  });

  it('SwiperDemoApp 应能正常渲染', () => {
    const widget = new SwiperDemoApp({ theme: Themes.light, type: 'SwiperDemoApp' } as any);
    expect(widget).toBeDefined();
    expect(widget).toBeInstanceOf(Widget);
    const result = widget.render();
    expect(result).toBeDefined();
  });

  it('SpreadsheetDemoApp 应能正常渲染', () => {
    // SpreadsheetDemoApp 是 class 组件
    const widget = new SpreadsheetDemoApp({
      width: 800,
      height: 600,
      theme: Themes.light,
      type: 'SpreadsheetDemoApp',
    } as any);
    expect(widget).toBeDefined();
    expect(widget).toBeInstanceOf(Widget);
    const result = widget.render();
    expect(result).toBeDefined();
  });

  it('MindmapDemo 应能正常实例化', () => {
    const widget = new MindmapDemo({
      width: 800,
      height: 600,
      theme: Themes.light,
      type: 'MindmapDemo',
    } as any);
    expect(widget).toBeDefined();
    expect(widget).toBeInstanceOf(Widget);
  });

  it('ResumeDemoApp 应能正常渲染', () => {
    const widget = new ResumeDemoApp({
      width: 800,
      height: 600,
      theme: Themes.light,
      type: 'ResumeDemoApp',
    } as any);
    expect(widget).toBeDefined();
    expect(widget).toBeInstanceOf(Widget);
    const result = widget.render();
    expect(result).toBeDefined();
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
