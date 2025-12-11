import { useEffect, useRef } from 'react';

import { getTestTemplate } from './data';
import styles from './index.module.less';

import Runtime from '@/runtime';

type Theme = 'light' | 'dark';

export default function CompleteTab({ theme }: { theme: Theme }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    el.innerHTML = '';
    if (!el.id) {
      el.id = 'complete-tab-container-' + Math.random().toString(36).slice(2);
    }
    Runtime.create(el.id, {
      renderer: 'canvas2d',
      background: theme === 'dark' ? '#000000' : '#ffffff',
      backgroundAlpha: 1,
    }).then((rt) => {
      rt.renderTemplate(getTestTemplate);
    });
    return () => {
      el.innerHTML = '';
    };
  }, [theme]);

  return (
    <div className={styles.root}>
      <h2>完整流程测试</h2>
      <p>测试 Build → Layout → Paint 三个阶段的完整渲染流程</p>
      <div ref={containerRef} className={styles.canvas} />
    </div>
  );
}
