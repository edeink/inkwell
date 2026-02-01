import { type CSSProperties, type PropsWithChildren } from 'react';

export type TypographyTextProps = PropsWithChildren<{
  type?: 'secondary';
  style?: CSSProperties;
  className?: string;
}>;

export function TypographyText({ children, type, style, className }: TypographyTextProps) {
  return (
    <span
      className={className}
      style={{
        color: type === 'secondary' ? 'var(--ink-demo-text-secondary)' : undefined,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
