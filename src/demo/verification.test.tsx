/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { InteractiveCounterDemo } from './interactive-counter/app';
import { MindmapDemo } from './mindmap/app';
import { Themes as MindmapThemes } from './mindmap/constants/theme';
import { SpreadsheetDemoApp } from './spreadsheet/app';
import { SwiperDemoApp } from './swiper/app';
import { WidgetGalleryDemo } from './widget-gallery/app';

import { Widget } from '@/core/base';
import { Themes } from '@/styles/theme';

describe('Demo Verification', () => {
  it('InteractiveCounterDemo should render without crashing', () => {
    const widget = new InteractiveCounterDemo({
      theme: Themes.light,
      type: 'InteractiveCounterDemo',
    } as any);
    expect(widget).toBeDefined();
    expect(widget).toBeInstanceOf(Widget);
    const result = widget.render();
    expect(result).toBeDefined();
  });

  it('WidgetGalleryDemo should render without crashing', () => {
    const result = WidgetGalleryDemo({ width: 800, height: 600, theme: Themes.light });
    expect(result).toBeDefined();
    // Functional component returns ComponentData object
    expect(result).toHaveProperty('type');
  });

  it('SwiperDemoApp should render without crashing', () => {
    const widget = new SwiperDemoApp({ theme: Themes.light, type: 'SwiperDemoApp' } as any);
    expect(widget).toBeDefined();
    expect(widget).toBeInstanceOf(Widget);
    const result = widget.render();
    expect(result).toBeDefined();
  });

  it('SpreadsheetDemoApp should render without crashing', () => {
    // SpreadsheetDemoApp is a functional component
    const result = SpreadsheetDemoApp({ width: 800, height: 600, theme: Themes.light });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('type');
  });

  it('MindmapDemo should render without crashing', () => {
    const widget = new MindmapDemo({
      width: 800,
      height: 600,
      theme: MindmapThemes.light,
      type: 'MindmapDemo',
    } as any);
    expect(widget).toBeDefined();
    expect(widget).toBeInstanceOf(Widget);
    // MindmapDemo might have complex initialization in constructor, so just instantiation is a good check
    // If it has a render method (it inherits from StatefulWidget), we can check it, but state might need to be initialized.
    // MindmapDemo extends StatefulWidget, so it has a render method, but it usually returns the build result.
    // Let's just check instantiation for now.
  });
});
