import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

import styles from './index.module.less';

export type ButtonProps = PropsWithChildren<{
  className?: string;
  style?: CSSProperties;
  type?: 'default' | 'primary' | 'text';
  danger?: boolean;
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
  icon?: ReactNode;
  onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}>;

export function Button({
  className,
  style,
  type = 'default',
  danger,
  size,
  disabled,
  icon,
  children,
  onClick,
}: ButtonProps) {
  const height = size === 'small' ? 28 : size === 'large' ? 36 : 32;
  const padding = size === 'small' ? '0 10px' : size === 'large' ? '0 14px' : '0 12px';
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height,
    padding,
    borderRadius: 10,
    border: type === 'text' ? '1px solid transparent' : '1px solid var(--ink-demo-border)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    background:
      type === 'primary'
        ? 'var(--ink-demo-primary)'
        : type === 'text'
          ? 'transparent'
          : 'var(--ink-demo-bg-container)',
    color:
      type === 'primary'
        ? '#fff'
        : danger
          ? 'var(--ink-demo-danger)'
          : 'var(--ink-demo-text-primary)',
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <button
      type="button"
      data-ink-type={type}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={{ ...base, ...style }}
      disabled={disabled}
      onClick={disabled ? undefined : (e) => onClick?.(e)}
    >
      {icon ? <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span> : null}
      {children}
    </button>
  );
}
