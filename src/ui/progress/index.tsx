import { type CSSProperties } from 'react';

export type ProgressProps = {
  percent?: number;
  style?: CSSProperties;
  className?: string;
  size?: 'small' | 'default';
  strokeColor?: string;
  trailColor?: string;
  showInfo?: boolean;
};

export function Progress({
  percent = 0,
  style,
  className,
  size,
  strokeColor,
  trailColor,
  showInfo = true,
}: ProgressProps) {
  const p = Math.max(0, Math.min(100, percent));
  const h = size === 'small' ? 6 : 8;
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <div
        style={{
          flex: 1,
          height: h,
          borderRadius: 999,
          background: trailColor ?? 'var(--ink-demo-border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${p}%`,
            background: strokeColor ?? 'var(--ink-demo-primary)',
          }}
        />
      </div>
      {showInfo ? (
        <span style={{ fontSize: 12, color: 'var(--ink-demo-text-secondary)', minWidth: 32 }}>
          {p}%
        </span>
      ) : null}
    </div>
  );
}
