import { theme as antTheme, ConfigProvider, Tabs } from 'antd';
import cn from 'classnames';
import { useEffect, useMemo, useState } from 'react';

import EditableText, { meta as EditableTextMeta } from './editable-text';
import styles from './index.module.less';
import InteractiveCounter, { meta as InteractiveCounterMeta } from './interactive-counter';
import MarkdownPreview, { meta as MarkdownPreviewMeta } from './markdown-preview';
import Mindmap, { meta as MindmapMeta } from './mindmap';
import Spreadsheet, { meta as SpreadsheetMeta } from './spreadsheet';
import Swiper, { meta as SwiperMeta } from './swiper';
import { DemoKey, ThemeType } from './type';
import WidgetGallery, { meta as WidgetGalleryMeta } from './widget-gallery';

import { DevTools } from '@/devtools';
import { getCurrentThemeMode, subscribeToThemeChange } from '@/styles/theme';

export default function UnifiedDemo() {
  const [activeKey, setActiveKey] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && Object.values(DemoKey).includes(tab as DemoKey)) {
      return tab;
    }
    return DemoKey.MarkdownPreview;
  });

  const [theme, setTheme] = useState<ThemeType>(() => {
    return getCurrentThemeMode() === 'dark' ? ThemeType.Dark : ThemeType.Light;
  });

  const handleTabChange = (key: string) => {
    setActiveKey(key);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.pushState({}, '', url.toString());
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && Object.values(DemoKey).includes(tab as DemoKey)) {
        setActiveKey(tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // 监听主题变化
    const unsubscribe = subscribeToThemeChange((mode) => {
      setTheme(mode === 'dark' ? ThemeType.Dark : ThemeType.Light);
    });
    return unsubscribe;
  }, []);

  const demos = useMemo(
    () => [
      { Component: InteractiveCounter, ...InteractiveCounterMeta },
      { Component: EditableText, ...EditableTextMeta },
      { Component: WidgetGallery, ...WidgetGalleryMeta },
      { Component: Swiper, ...SwiperMeta },
      { Component: Mindmap, ...MindmapMeta },
      { Component: Spreadsheet, ...SpreadsheetMeta },
      { Component: MarkdownPreview, ...MarkdownPreviewMeta },
    ],
    [],
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === ThemeType.Dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
      }}
    >
      <div className={cn(styles.container, { [styles.dark]: theme === ThemeType.Dark })}>
        <Tabs
          className={styles.tabs}
          activeKey={activeKey}
          onChange={handleTabChange}
          destroyInactiveTabPane
          items={demos.map((demo) => ({
            key: demo.key,
            label: demo.label,
            children: (
              <>
                <div className={styles.description}>
                  <h3>{demo.label}</h3>
                  <p>{demo.description}</p>
                </div>
                <div style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden' }}>
                  <demo.Component />
                  <DevTools />
                </div>
              </>
            ),
          }))}
        />
      </div>
    </ConfigProvider>
  );
}
