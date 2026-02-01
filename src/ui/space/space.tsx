import { type CSSProperties, type PropsWithChildren } from 'react';

export type SpaceProps = PropsWithChildren<{
  className?: string;
  style?: CSSProperties;
  direction?: 'horizontal' | 'vertical';
  size?: number;
  align?: CSSProperties['alignItems'];
  wrap?: boolean;
}>;

export function Space({
  className,
  style,
  direction = 'horizontal',
  size = 8,
  align = 'center',
  wrap,
  children,
}: SpaceProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: direction === 'vertical' ? 'column' : 'row',
        gap: size,
        alignItems: align,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
