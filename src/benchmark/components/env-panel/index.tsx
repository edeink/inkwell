import { useMemo } from 'react';

import styles from './index.module.less';

export type EnvItem = { label: string; value: string };

function collectEnv() {
  const ua = navigator.userAgent;
  const plat = navigator.platform;
  const cores = (navigator as any).hardwareConcurrency ?? undefined;
  const mem = (navigator as any).deviceMemory ?? undefined;
  const dpr = window.devicePixelRatio;
  const screenSize = `${window.screen.width}x${window.screen.height}`;
  const lang = navigator.language;
  return [
    {
      label: '操作系统',
      value: plat,
    },
    {
      label: '浏览器',
      value: ua,
    },
    {
      label: 'CPU 核心',
      value: cores ? String(cores) : '未知',
    },
    {
      label: '内存(GB)',
      value: mem ? String(mem) : '未知',
    },
    {
      label: 'DPR',
      value: String(dpr),
    },
    {
      label: '分辨率',
      value: screenSize,
    },
    {
      label: '语言',
      value: lang,
    },
  ];
}

export default function EnvPanel() {
  const items = useMemo(() => collectEnv(), []);
  return (
    <div className={styles.panel}>
      <div className={styles.title}>测试环境</div>
      <ul className={styles.list}>
        {items.map((it) => (
          <li key={it.label} className={styles.item}>
            <span className={styles.label}>{it.label}</span>
            <span className={styles.value}>{it.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
