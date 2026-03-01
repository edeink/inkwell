import cn from 'classnames';
import { useEffect, useMemo, useRef, useState } from 'react';

import CompGallery, { meta as CompGalleryMeta } from './comp-gallery';
import EditableText, { meta as EditableTextMeta } from './editable-text';
import GlassCard, { meta as GlassCardMeta } from './glass-card';
import styles from './index.module.less';
import InteractiveCounter, { meta as InteractiveCounterMeta } from './interactive-counter';
import Mindmap, { meta as MindmapMeta } from './mindmap';
import Resume, { meta as ResumeMeta } from './resume';
import Spreadsheet, { meta as SpreadsheetMeta } from './spreadsheet';
import Swiper, { meta as SwiperMeta } from './swiper';
import { DemoKey, ThemeType } from './type';
import WidgetGallery, { meta as WidgetGalleryMeta } from './widget-gallery';
import Wiki, { meta as WikiMeta } from './wiki';

import {
  getCurrentThemeMode,
  getCurrentThemePreset,
  setThemePreset,
  subscribeTheme,
  ThemePresetLabels,
  type ThemePresetKey,
} from '@/styles/theme';
import { ConfigProvider, Select, Tabs, theme as uiTheme } from '@/ui';

export default function UnifiedDemo() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeKey, setActiveKey] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && Object.values(DemoKey).includes(tab as DemoKey)) {
      return tab;
    }
    return DemoKey.Wiki;
  });

  const [theme, setTheme] = useState<ThemeType>(() => {
    return getCurrentThemeMode() === 'dark' ? ThemeType.Dark : ThemeType.Light;
  });

  const [themePreset, setThemePresetState] = useState<ThemePresetKey>(() =>
    getCurrentThemePreset(),
  );

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
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const allowHorizontalWheel = (target: EventTarget | null): boolean => {
      let cur = (target as HTMLElement | null) ?? null;
      while (cur && cur !== el) {
        try {
          const style = window.getComputedStyle(cur);
          const overflowX = style.overflowX;
          if (
            (overflowX === 'auto' || overflowX === 'scroll') &&
            cur.scrollWidth > cur.clientWidth
          ) {
            return true;
          }
        } catch (err) {
          void err;
        }
        cur = cur.parentElement;
      }
      return false;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        return;
      }
      if (allowHorizontalWheel(e.target)) {
        return;
      }
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 0) {
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => {
    // 监听主题变化
    return subscribeTheme((_theme, mode) => {
      setTheme(mode === 'dark' ? ThemeType.Dark : ThemeType.Light);
      setThemePresetState(getCurrentThemePreset());
    });
  }, []);

  const demos = useMemo(
    () => [
      { Component: InteractiveCounter, ...InteractiveCounterMeta },
      { Component: EditableText, ...EditableTextMeta },
      { Component: WidgetGallery, ...WidgetGalleryMeta },
      { Component: CompGallery, ...CompGalleryMeta },
      { Component: Swiper, ...SwiperMeta },
      { Component: GlassCard, ...GlassCardMeta },
      { Component: Mindmap, ...MindmapMeta },
      { Component: Spreadsheet, ...SpreadsheetMeta },
      { Component: Wiki, ...WikiMeta },
      { Component: Resume, ...ResumeMeta },
    ],
    [],
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === ThemeType.Dark ? uiTheme.darkAlgorithm : uiTheme.defaultAlgorithm,
        token: {
          colorPrimary: 'var(--ink-demo-primary)',
          colorSuccess: 'var(--ink-demo-success)',
          colorWarning: 'var(--ink-demo-warning)',
          colorError: 'var(--ink-demo-danger)',
          colorText: 'var(--ink-demo-text-primary)',
          colorTextSecondary: 'var(--ink-demo-text-secondary)',
          colorBgBase: 'var(--ink-demo-bg-base)',
          colorBgContainer: 'var(--ink-demo-bg-container)',
          colorBorder: 'var(--ink-demo-border)',
        },
      }}
    >
      <div
        ref={containerRef}
        className={cn(styles.container, { [styles.dark]: theme === ThemeType.Dark })}
      >
        <div className={styles.frame}>
          <Tabs
            className={styles.tabs}
            activeKey={activeKey}
            onChange={handleTabChange}
            destroyOnHidden
            tabBarExtraContent={{
              right: (
                <div className={styles.tabExtra}>
                  <span className={styles.tabExtraLabel}>配色</span>
                  <Select
                    value={themePreset}
                    onChange={(v) => {
                      const next = v as ThemePresetKey;
                      setThemePresetState(next);
                      setThemePreset(next);
                    }}
                    options={(Object.keys(ThemePresetLabels) as ThemePresetKey[]).map((k) => ({
                      label: ThemePresetLabels[k],
                      value: k,
                    }))}
                    className={styles.presetSelect}
                  />
                </div>
              ),
            }}
            items={demos.map((demo) => ({
              key: demo.key,
              label: demo.label,
              children: (
                <>
                  <div className={styles.description}>
                    <h3>{demo.label}</h3>
                    <p>{demo.description}</p>
                  </div>
                  <div className={styles.demoWrap}>
                    <demo.Component />
                  </div>
                </>
              ),
            }))}
          />
        </div>
      </div>
    </ConfigProvider>
  );
}
