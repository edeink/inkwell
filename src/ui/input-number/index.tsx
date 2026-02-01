import { useEffect, useState, type CSSProperties } from 'react';

export type InputNumberProps = {
  className?: string;
  style?: CSSProperties;
  value?: number | null;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  formatter?: (value?: string | number) => string;
  parser?: (displayValue: string) => number;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  onChange?: (value: number | null) => void;
};

export function InputNumber({
  className,
  style,
  value,
  min,
  max,
  step,
  precision,
  formatter,
  parser,
  disabled,
  size,
  onChange,
}: InputNumberProps) {
  const height = size === 'small' ? 28 : size === 'large' ? 36 : 32;
  const useTextMode = precision != null || formatter != null || parser != null;

  const clamp = (n: number) => {
    let v = n;
    if (min != null && Number.isFinite(min)) {
      v = Math.max(min, v);
    }
    if (max != null && Number.isFinite(max)) {
      v = Math.min(max, v);
    }
    return v;
  };

  const formatValue = (n: number | null | undefined) => {
    if (n == null) {
      return '';
    }
    const fixed = precision != null ? Number(n).toFixed(precision) : String(n);
    return formatter ? formatter(fixed) : String(fixed);
  };

  const parseValue = (raw: string) => {
    const txt = raw.trim();
    if (!txt) {
      return null;
    }
    const n = parser ? parser(txt) : Number(txt);
    if (!Number.isFinite(n)) {
      return null;
    }
    return clamp(n);
  };

  const [text, setText] = useState(() => formatValue(value));
  useEffect(() => {
    if (!useTextMode) {
      return;
    }
    setText(formatValue(value));
  }, [useTextMode, value, precision]);

  if (useTextMode) {
    return (
      <input
        type="text"
        inputMode="decimal"
        className={className}
        style={{
          width: '100%',
          height,
          borderRadius: 10,
          border: '1px solid var(--ink-demo-border)',
          background: 'var(--ink-demo-bg-container)',
          color: 'var(--ink-demo-text-primary)',
          padding: '0 10px',
          ...style,
        }}
        disabled={disabled}
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          onChange?.(parseValue(raw));
        }}
        onBlur={() => {
          const parsed = parseValue(text);
          setText(formatValue(parsed));
        }}
      />
    );
  }
  return (
    <input
      type="number"
      className={className}
      style={{
        width: '100%',
        height,
        borderRadius: 10,
        border: '1px solid var(--ink-demo-border)',
        background: 'var(--ink-demo-bg-container)',
        color: 'var(--ink-demo-text-primary)',
        padding: '0 10px',
        ...style,
      }}
      disabled={disabled}
      value={value ?? ''}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') {
          onChange?.(null);
          return;
        }
        const n = Number(raw);
        onChange?.(Number.isFinite(n) ? clamp(n) : null);
      }}
    />
  );
}
