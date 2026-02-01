import { type ChangeEvent, type CSSProperties, type FocusEvent, type ReactNode } from 'react';

export type InputProps = {
  className?: string;
  style?: CSSProperties;
  value?: string;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  prefix?: ReactNode;
  suffix?: ReactNode;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
};

export function Input({
  className,
  style,
  value,
  placeholder,
  allowClear,
  disabled,
  size,
  prefix,
  suffix,
  onChange,
  onBlur,
}: InputProps) {
  const height = size === 'small' ? 28 : size === 'large' ? 36 : 32;
  const leftPad = prefix ? 28 : 10;
  const rightPad = allowClear || suffix ? 28 : 10;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: '100%' }}>
      {prefix ? (
        <span
          style={{
            position: 'absolute',
            left: 8,
            top: 0,
            bottom: 0,
            display: 'inline-flex',
            alignItems: 'center',
            pointerEvents: 'none',
            color: 'var(--ink-demo-text-secondary)',
          }}
        >
          {prefix}
        </span>
      ) : null}
      <input
        className={className}
        style={{
          width: '100%',
          height,
          borderRadius: 10,
          border: '1px solid var(--ink-demo-border)',
          background: 'var(--ink-demo-bg-container)',
          color: 'var(--ink-demo-text-primary)',
          padding: `0 ${rightPad}px 0 ${leftPad}px`,
          ...style,
        }}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={onChange}
        onBlur={onBlur}
      />
      {suffix ? (
        <span
          style={{
            position: 'absolute',
            right: 8,
            top: 0,
            bottom: 0,
            display: 'inline-flex',
            alignItems: 'center',
            color: 'var(--ink-demo-text-secondary)',
            pointerEvents: 'auto',
          }}
        >
          {suffix}
        </span>
      ) : null}
      {allowClear && value ? (
        <button
          type="button"
          onClick={() => {
            const ev = {
              target: { value: '' },
            } as unknown as ChangeEvent<HTMLInputElement>;
            onChange?.(ev);
          }}
          style={{
            position: 'absolute',
            right: 6,
            top: 0,
            bottom: 0,
            width: 22,
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-demo-text-secondary)',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
