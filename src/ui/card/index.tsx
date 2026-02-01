import { type CSSProperties, type PropsWithChildren, type ReactNode } from 'react';

export type CardProps = PropsWithChildren<{
  title?: ReactNode;
  bordered?: boolean;
  style?: CSSProperties;
  className?: string;
}>;

export function Card({ title, bordered = true, style, className, children }: CardProps) {
  return (
    <div
      className={className}
      style={{
        border: bordered ? '1px solid var(--ink-demo-border)' : '1px solid transparent',
        borderRadius: 14,
        background: 'var(--ink-demo-bg-container)',
        padding: 12,
        ...style,
      }}
    >
      {title ? (
        <div style={{ marginBottom: 10, fontWeight: 600, color: 'var(--ink-demo-text-primary)' }}>
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}
