import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

import styles from './index.module.less';

export type TabsItem = {
  key: string;
  label: ReactNode;
  children: ReactNode;
};

export type TabsProps = {
  className?: string;
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  destroyOnHidden?: boolean;
  items: TabsItem[];
  tabBarExtraContent?: { right?: ReactNode };
  size?: 'small' | 'middle' | 'large';
  tabBarPadding?: CSSProperties['padding'];
};

export function Tabs({
  className,
  activeKey,
  defaultActiveKey,
  onChange,
  destroyOnHidden,
  items,
  tabBarExtraContent,
  size,
  tabBarPadding = '8px var(--vp-layout-padding, 24px)',
}: TabsProps) {
  const [innerKey, setInnerKey] = useState<string>(() => defaultActiveKey ?? items[0]?.key ?? '');
  useEffect(() => {
    if (defaultActiveKey != null) {
      setInnerKey(defaultActiveKey);
    }
  }, [defaultActiveKey]);
  const key = activeKey ?? innerKey;
  const active = items.find((i) => i.key === key) ?? items[0];
  const tabH = size === 'small' ? 28 : size === 'large' ? 34 : 30;
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid var(--ink-demo-border)',
          padding: tabBarPadding,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto' }}>
          {items.map((it) => {
            const isActive = it.key === key;
            return (
              <button
                key={it.key}
                type="button"
                data-active={isActive ? 'true' : 'false'}
                className={styles.tab}
                style={{
                  appearance: 'none',
                  border: '1px solid transparent',
                  background: isActive
                    ? 'color-mix(in srgb, var(--ink-demo-primary), transparent 90%)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--ink-demo-text-primary)'
                    : 'var(--ink-demo-text-secondary)',
                  height: tabH,
                  padding: '0 10px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => {
                  if (activeKey == null) {
                    setInnerKey(it.key);
                  }
                  onChange?.(it.key);
                }}
              >
                {it.label}
              </button>
            );
          })}
        </div>
        {tabBarExtraContent?.right ? (
          <div style={{ flexShrink: 0 }}>{tabBarExtraContent.right}</div>
        ) : null}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {destroyOnHidden ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {active?.children}
          </div>
        ) : (
          items.map((it) => (
            <div
              key={it.key}
              style={{
                display: it.key === key ? 'flex' : 'none',
                flex: 1,
                minHeight: 0,
                flexDirection: 'column',
              }}
            >
              {it.children}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
