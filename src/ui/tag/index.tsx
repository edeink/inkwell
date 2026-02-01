import { type CSSProperties, type PropsWithChildren } from 'react';

export type TagProps = PropsWithChildren<{
  color?: string;
  style?: CSSProperties;
  className?: string;
}>;

export function Tag({ color, style, className, children }: TagProps) {
  const resolve = (c?: string) => {
    if (!c || c === 'default') {
      return {
        bg: 'color-mix(in srgb, var(--ink-demo-bg-container), transparent 10%)',
        border: 'var(--ink-demo-border)',
        text: 'var(--ink-demo-text-primary)',
      };
    }
    if (c === 'processing' || c === 'blue') {
      return {
        bg: 'color-mix(in srgb, var(--ink-demo-primary), transparent 85%)',
        border: 'color-mix(in srgb, var(--ink-demo-primary), transparent 55%)',
        text: 'var(--ink-demo-text-primary)',
      };
    }
    if (c === 'success') {
      return {
        bg: 'color-mix(in srgb, var(--ink-demo-success), transparent 85%)',
        border: 'color-mix(in srgb, var(--ink-demo-success), transparent 55%)',
        text: 'var(--ink-demo-text-primary)',
      };
    }
    if (c === 'warning') {
      return {
        bg: 'color-mix(in srgb, var(--ink-demo-warning), transparent 85%)',
        border: 'color-mix(in srgb, var(--ink-demo-warning), transparent 55%)',
        text: 'var(--ink-demo-text-primary)',
      };
    }
    if (c === 'error' || c === 'red') {
      return {
        bg: 'color-mix(in srgb, var(--ink-demo-danger), transparent 85%)',
        border: 'color-mix(in srgb, var(--ink-demo-danger), transparent 55%)',
        text: 'var(--ink-demo-text-primary)',
      };
    }
    return { bg: c, border: 'var(--ink-demo-border)', text: 'var(--ink-demo-text-primary)' };
  };
  const resolved = resolve(color);
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 12,
        border: `1px solid ${resolved.border}`,
        background: resolved.bg,
        color: resolved.text,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
