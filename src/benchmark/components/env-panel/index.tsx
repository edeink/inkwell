import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import styles from './index.module.less';

import { Button, Space, Tooltip } from '@/ui';
import {
  AppleOutlined,
  ChromeOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DashboardOutlined,
  DesktopOutlined,
  GlobalOutlined,
  HddOutlined,
  InfoCircleOutlined,
  PoweroffOutlined,
  WifiOutlined,
} from '@/ui/icons';

export type EnvItem = { label: string; value: string; icon?: ReactNode };

type Props = {
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
};

/**
 * 简单 UA 解析：识别常见浏览器名称与主版本号。
 * @param ua User-Agent 字符串
 * @returns 浏览器名称、版本与图标
 */
function parseBrowser(ua: string): { name: string; version: string; icon: ReactNode } {
  const mEdge = ua.match(/Edg\/(\d+)/);
  if (mEdge) {
    return { name: 'Edge', version: mEdge[1], icon: <GlobalOutlined /> };
  }
  const mChrome = ua.match(/Chrome\/(\d+)/);
  if (mChrome && !ua.includes('OPR') && !ua.includes('Edg')) {
    return { name: 'Chrome', version: mChrome[1], icon: <ChromeOutlined /> };
  }
  const mFirefox = ua.match(/Firefox\/(\d+)/);
  if (mFirefox) {
    return { name: 'Firefox', version: mFirefox[1], icon: <GlobalOutlined /> };
  }
  const mSafari = ua.match(/Version\/(\d+)[^)]*Safari/);
  if (mSafari) {
    return { name: 'Safari', version: mSafari[1], icon: <AppleOutlined /> };
  }
  const mOPR = ua.match(/OPR\/(\d+)/);
  if (mOPR) {
    return { name: 'Opera', version: mOPR[1], icon: <GlobalOutlined /> };
  }
  return { name: 'Browser', version: '', icon: <GlobalOutlined /> };
}

function formatResolution(w: number, h: number) {
  return `${w} × ${h}`;
}

/**
 * 收集运行环境信息：平台、浏览器、硬件、网络与时区。
 * @returns 环境信息条目列表
 */
function collectEnv() {
  const ua = navigator.userAgent;
  const plat = navigator.platform;
  const cores =
    (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? undefined;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? undefined;
  const dpr = window.devicePixelRatio;
  const screenSize = formatResolution(window.screen.width, window.screen.height);
  const lang = navigator.language;
  const br = parseBrowser(ua);
  const online = navigator.onLine;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return [
    {
      label: '操作系统',
      value: plat,
      icon: <DesktopOutlined />,
    },
    {
      label: '浏览器',
      value: br.version ? `${br.name} ${br.version}` : br.name,
      icon: br.icon,
    },
    {
      label: 'CPU 核心',
      value: cores ? String(cores) : '未知',
      icon: <DashboardOutlined />,
    },
    {
      label: '内存(GB)',
      value: mem ? String(mem) : '未知',
      icon: <HddOutlined />,
    },
    {
      label: 'DPR (设备像素比)',
      value: String(dpr),
      icon: <InfoCircleOutlined />,
    },
    {
      label: '分辨率',
      value: screenSize,
      icon: <DesktopOutlined />,
    },
    {
      label: '语言',
      value: lang,
      icon: <GlobalOutlined />,
    },
    {
      label: '网络',
      value: online ? '在线' : '离线',
      icon: <WifiOutlined />,
    },
    {
      label: '时区',
      value: tz,
      icon: <ClockCircleOutlined />,
    },
  ];
}

/**
 * EnvPanel
 * 展示环境信息列表，并支持复制到剪贴板。
 */
export default function EnvPanel() {
  const items = useMemo(() => collectEnv(), []);
  const [battery, setBattery] = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<null | 'success' | 'error'>(null);
  const copyTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const navAny = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; charging: boolean }>;
    };
    if (navAny.getBattery) {
      navAny
        .getBattery()
        .then((b) => {
          if (!b) {
            return;
          }
          const pct = Math.round((b.level || 0) * 100);
          setBattery(`${pct}% ${b.charging ? '充电中' : ''}`.trim());
        })
        .catch(() => {});
    }
  }, []);
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, []);
  const withExtra = battery
    ? items.concat([{ label: '电池', value: battery, icon: <PoweroffOutlined /> }])
    : items;

  function showFeedback(type: 'success' | 'error') {
    setCopyResult(type);
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopyResult(null);
      copyTimerRef.current = null;
    }, 1800);
  }

  function copyText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise<void>((resolve, reject) => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (ok) {
          resolve();
        } else {
          reject(new Error('copy failed'));
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>测试环境</div>
        <div className={styles.actions}>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            className={styles.copyBtn}
            onClick={() => {
              const text = withExtra.map((it) => `${it.label}: ${it.value}`).join('\n');
              copyText(text)
                .then(() => showFeedback('success'))
                .catch(() => showFeedback('error'));
            }}
          >
            复制环境信息
          </Button>
          {copyResult && (
            <div
              role="status"
              aria-live="polite"
              className={[
                styles.copyToast,
                copyResult === 'success' ? styles.copyToastSuccess : styles.copyToastError,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {copyResult === 'success' ? '复制成功' : '复制失败，请重试'}
            </div>
          )}
        </div>
      </div>
      <ul className={styles.list}>
        {withExtra.map((it) => (
          <li key={it.label} className={styles.item}>
            <Space size={8}>
              <span className={styles.itemIcon}>{it.icon}</span>
              <span className={styles.label}>{it.label}</span>
            </Space>
            <Space size={8}>
              {it.label.startsWith('DPR') ? (
                <Tooltip title="设备像素比：显示器物理像素与CSS像素的比值">
                  <span className={styles.value}>{it.value}</span>
                </Tooltip>
              ) : (
                <span className={styles.value}>{it.value}</span>
              )}
            </Space>
          </li>
        ))}
      </ul>
    </div>
  );
}
