/**
 * Devtools 性能面板
 *
 * 展示 Web Vitals 与调试功能开关。
 * 注意事项：依赖浏览器 PerformanceObserver。
 * 潜在副作用：注册性能观察器并读取性能指标。
 */
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useEffect, type CSSProperties } from 'react';

import { featureToggleStore, setFeatureToggle } from './features-toggle';

/**
 * WebVitals 指标状态
 *
 * 注意事项：未采样到时为 null。
 * 潜在副作用：无。
 */
type WebVitalsState = {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
};

const PANEL_WIDTH = 360;

/**
 * 监听 WebVitals 指标
 *
 * @returns 当前 WebVitals 状态
 * @remarks
 * 注意事项：仅在浏览器环境生效。
 * 潜在副作用：注册 PerformanceObserver。
 */
function useWebVitals(): WebVitalsState {
  const state = useLocalObservable(() => ({
    lcp: null as number | null,
    fid: null as number | null,
    cls: null as number | null,
    setState(next: Partial<WebVitalsState>) {
      if (typeof next.lcp !== 'undefined') {
        this.lcp = next.lcp;
      }
      if (typeof next.fid !== 'undefined') {
        this.fid = next.fid;
      }
      if (typeof next.cls !== 'undefined') {
        this.cls = next.cls;
      }
    },
  }));

  useEffect(() => {
    let mounted = true;
    let lcpObserver: PerformanceObserver | null = null;
    let fidObserver: PerformanceObserver | null = null;
    let clsObserver: PerformanceObserver | null = null;
    let clsValue = 0;

    const updateState = (next: Partial<WebVitalsState>) => {
      if (!mounted) {
        return;
      }
      state.setState(next);
    };

    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return () => {
        mounted = false;
      };
    }

    const supportedTypes = PerformanceObserver.supportedEntryTypes ?? [];

    if (supportedTypes.includes('largest-contentful-paint')) {
      lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry | undefined;
        if (last) {
          updateState({ lcp: last.startTime });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    }

    if (supportedTypes.includes('first-input')) {
      fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const first = entries[0] as PerformanceEntry | undefined;
        if (first) {
          const entry = first as PerformanceEntry & {
            processingStart?: number;
            startTime: number;
          };
          const processingStart = entry.processingStart ?? entry.startTime;
          const fid = Math.max(0, processingStart - entry.startTime);
          updateState({ fid });
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    }

    if (supportedTypes.includes('layout-shift')) {
      clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
          if (shift.hadRecentInput) {
            continue;
          }
          clsValue += shift.value ?? 0;
        }
        updateState({ cls: clsValue });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    }

    return () => {
      mounted = false;
      lcpObserver?.disconnect();
      fidObserver?.disconnect();
      clsObserver?.disconnect();
    };
  }, [state]);

  return state;
}

/**
 * 格式化指标值
 *
 * @param value 指标数值
 * @returns 展示文本
 * @remarks
 * 注意事项：空值返回占位符。
 * 潜在副作用：无。
 */
function formatMetric(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return '--';
  }
  return value.toFixed(2);
}

/**
 * FeaturePanel
 *
 * @returns React 元素
 * @remarks
 * 注意事项：依赖 featureToggleStore 的状态。
 * 潜在副作用：读取并更新功能开关状态。
 */
export default observer(function FeaturePanel() {
  const webVitals = useWebVitals();
  const renderCount = featureToggleStore.reactRenderCount;
  const groups = featureToggleStore.groups;

  const handleToggle = (key: string, next: boolean) => {
    setFeatureToggle(key, next);
    window.location.reload();
  };

  const panelStyle: CSSProperties = {
    position: 'fixed',
    top: 72,
    right: 16,
    width: PANEL_WIDTH,
    height: 'calc(100vh - 120px)',
    background: 'var(--ink-demo-bg-surface)',
    color: 'var(--ink-demo-text-primary)',
    border: '1px solid var(--ink-demo-border)',
    borderRadius: 10,
    boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyle: CSSProperties = {
    padding: '14px 16px',
    borderBottom: '1px solid var(--ink-demo-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const metricsStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    fontSize: 12,
    color: 'var(--ink-demo-text-secondary)',
  };

  const bodyStyle: CSSProperties = {
    padding: '12px 16px 16px',
    overflow: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };

  const groupStyle: CSSProperties = {
    background: 'var(--ink-demo-bg-container)',
    border: '1px solid var(--ink-demo-border-secondary)',
    borderRadius: 10,
    padding: 12,
  };

  const groupTitleStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--ink-demo-text-secondary)',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const toggleListStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };

  const toggleItemStyle: CSSProperties = {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  };

  const toggleLabelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    cursor: 'pointer',
  };

  const descStyle: CSSProperties = {
    fontSize: 12,
    color: 'var(--ink-demo-text-secondary)',
    marginTop: 2,
  };

  const inputStyle: CSSProperties = {
    marginTop: 3,
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div style={{ fontWeight: 600 }}>性能诊断面板</div>
        <div style={metricsStyle}>
          <div>React Render：{renderCount}</div>
          <div>LCP：{formatMetric(webVitals.lcp)}</div>
          <div>FID：{formatMetric(webVitals.fid)}</div>
          <div>CLS：{formatMetric(webVitals.cls)}</div>
        </div>
      </div>
      <div style={bodyStyle}>
        {groups.map((group) => (
          <div key={group.key} style={groupStyle}>
            <div style={groupTitleStyle}>
              <span>{group.label}</span>
              <span>{group.items.length}</span>
            </div>
            <div style={toggleListStyle}>
              {group.items.map((item) => (
                <label key={item.key} style={toggleLabelStyle}>
                  <input
                    type="checkbox"
                    checked={featureToggleStore.isEnabled(item.key, item.defaultValue)}
                    style={inputStyle}
                    onChange={(e) => handleToggle(item.key, e.target.checked)}
                  />
                  <div style={toggleItemStyle}>
                    <div>
                      <div style={{ fontSize: 13 }}>{item.label}</div>
                      <div style={descStyle}>{item.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
