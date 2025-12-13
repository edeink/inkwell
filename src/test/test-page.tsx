import React, { useEffect, useState } from 'react';

import { DevTools } from '../devtools/index';

import CompleteTab from './components/complete-tab';
import CounterTab from './components/counter-tab';
import RendererTab from './components/renderer-tab';
import styles from './index.module.less';

//

/**
 * 渲染器测试类
 * 用于直接测试不同渲染器的图片和文字渲染功能
 */
type Theme = 'light' | 'dark';
type TabType = 'complete' | 'renderer' | 'counter';

const TestPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('complete');
  const [theme, setTheme] = useState<Theme>('light');
  const [showDevtools, setShowDevtools] = useState(
    () => localStorage.getItem('INKWELL_DEVTOOLS_VISIBLE') === 'true',
  );
  useEffect(() => {
    function onGlobalKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowDevtools(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        setShowDevtools(true);
      }
    }
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, []);

  useEffect(() => {
    localStorage.setItem('INKWELL_DEVTOOLS_VISIBLE', String(showDevtools));
  }, [showDevtools]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.dark : styles.light}`}>
      <div className={styles.themeSwitch} onClick={toggleTheme}>
        <span className={styles.switchLabel}>{theme === 'dark' ? '黑夜' : '白天'}</span>
        <span className={`${styles.switch} ${theme === 'dark' ? styles.on : styles.off}`}></span>
      </div>
      <h1 className={styles.title}>渲染器测试页面</h1>
      {/* Tab 导航 */}
      <div className={styles.tabNavigation}>
        <button
          onClick={() => setActiveTab('complete')}
          className={`${styles.tabButton} ${activeTab === 'complete' ? styles.active : ''}`}
        >
          完整流程测试
        </button>
        <button
          onClick={() => setActiveTab('renderer')}
          className={`${styles.tabButton} ${activeTab === 'renderer' ? styles.active : ''}`}
        >
          渲染器测试
        </button>
        <button
          onClick={() => setActiveTab('counter')}
          className={`${styles.tabButton} ${activeTab === 'counter' ? styles.active : ''}`}
        >
          计数器测试
        </button>
      </div>
      {showDevtools && (
        <div style={{ marginTop: 12 }}>
          <DevTools />
        </div>
      )}
      {activeTab === 'complete' && <CompleteTab theme={theme} />}
      {activeTab === 'renderer' && <RendererTab theme={theme} />}
      {activeTab === 'counter' && <CounterTab theme={theme} />}
    </div>
  );
};

export default TestPage;
