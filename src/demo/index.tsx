import { BulbFilled, BulbOutlined } from '@ant-design/icons';
import { theme as antTheme, Button, ConfigProvider, Tabs } from 'antd';
import cn from 'classnames';
import { useMemo, useState } from 'react';

import styles from './index.module.less';
import InteractiveCounter, { meta as InteractiveCounterMeta } from './interactive-counter';
import Mindmap, { meta as MindmapMeta } from './mindmap';
import Swiper, { meta as SwiperMeta } from './swiper';
import WidgetGallery, { meta as WidgetGalleryMeta } from './widget-gallery';

import { DevTools } from '@/devtools';

type ThemeType = 'light' | 'dark';

export default function UnifiedDemo() {
  const [activeKey, setActiveKey] = useState('mindmap');
  const [theme, setTheme] = useState<ThemeType>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const demos = useMemo(
    () => [
      { Component: InteractiveCounter, ...InteractiveCounterMeta },
      { Component: WidgetGallery, ...WidgetGalleryMeta },
      { Component: Swiper, ...SwiperMeta },
      { Component: Mindmap, ...MindmapMeta },
    ],
    [],
  );

  const tabBarExtraContent = (
    <div style={{ display: 'flex', alignItems: 'center', paddingRight: 16 }}>
      <Button
        type="text"
        icon={theme === 'light' ? <BulbOutlined /> : <BulbFilled />}
        onClick={toggleTheme}
      />
    </div>
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
      }}
    >
      <div className={cn(styles.container, { [styles.dark]: theme === 'dark' })}>
        <Tabs
          className={styles.tabs}
          activeKey={activeKey}
          onChange={setActiveKey}
          tabBarExtraContent={tabBarExtraContent}
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
