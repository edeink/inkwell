import {
  AppleOutlined,
  BgColorsOutlined,
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
} from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import styles from './index.module.less';

export type EnvItem = { label: string; value: string; icon?: React.ReactNode };

type Props = {
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
};

/**
 * 简单 UA 解析：识别常见浏览器名称与主版本号。
 * @param ua User-Agent 字符串
 * @returns 浏览器名称、版本与图标
 */
function parseBrowser(ua: string): { name: string; version: string; icon: React.ReactNode } {
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
  const withExtra = battery
    ? items.concat([{ label: '电池', value: battery, icon: <PoweroffOutlined /> }])
    : items;
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
              navigator.clipboard?.writeText(text).catch(() => {});
            }}
          >
            复制环境信息
          </Button>
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
