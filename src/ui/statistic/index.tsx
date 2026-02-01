import { type CSSProperties, type ReactNode } from 'react';

export type StatisticProps = {
  title?: ReactNode;
  value?: number | string;
  precision?: number;
  suffix?: ReactNode;
  valueStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
};

export function Statistic({
  title,
  value,
  precision,
  suffix,
  valueStyle,
  className,
  style,
}: StatisticProps) {
  const fmt = () => {
    if (value == null) {
      return '-';
    }
    if (typeof value === 'number' && precision != null) {
      return value.toFixed(precision);
    }
    return String(value);
  };
  return (
    <div className={className} style={style}>
      {title ? (
        <div style={{ fontSize: 12, color: 'var(--ink-demo-text-secondary)', marginBottom: 6 }}>
          {title}
        </div>
      ) : null}
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-demo-text-primary)' }}>
        <span style={valueStyle}>{fmt()}</span>
        {suffix ? <span style={{ marginLeft: 6, fontSize: 12 }}>{suffix}</span> : null}
      </div>
    </div>
  );
}
