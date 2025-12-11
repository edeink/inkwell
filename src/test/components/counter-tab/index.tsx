import { useEffect, useRef } from 'react';

import { getTestTemplate } from './data';
import styles from './index.module.less';

import Runtime from '@/runtime';

type Theme = 'light' | 'dark';

export default function CounterTab({ theme }: { theme: Theme }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    el.innerHTML = '';
    if (!el.id) {
      el.id = 'counter-tab-container-' + Math.random().toString(36).slice(2);
    }
    Runtime.create(el.id, {
      renderer: 'canvas2d',
      background: theme === 'dark' ? '#000000' : '#ffffff',
      backgroundAlpha: 1,
    }).then((rt) => {
      rt.renderTemplate(() => getTestTemplate(theme));
    });
    return () => {
      el.innerHTML = '';
    };
  }, [theme]);

  return (
    <div className={styles.root}>
      <h2>计数器测试</h2>
      <p>包含数字显示与按钮点击 +1 的交互</p>
      <div ref={containerRef} className={styles.canvas} />
    </div>
  );
}
