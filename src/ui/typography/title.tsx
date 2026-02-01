import { type CSSProperties, type PropsWithChildren } from 'react';

export type TypographyTitleProps = PropsWithChildren<{
  level?: 1 | 2 | 3 | 4 | 5;
  style?: CSSProperties;
  className?: string;
}>;

export function TypographyTitle({ children, level = 4, style, className }: TypographyTitleProps) {
  const size = level === 1 ? 28 : level === 2 ? 24 : level === 3 ? 20 : level === 4 ? 16 : 14;
  return (
    <div className={className} style={{ fontSize: size, fontWeight: 700, margin: 0, ...style }}>
      {children}
    </div>
  );
}
