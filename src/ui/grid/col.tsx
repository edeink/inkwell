import { type CSSProperties, type PropsWithChildren } from 'react';

import { useRowGutter } from './row';

export type ColProps = PropsWithChildren<{
  span?: number;
  style?: CSSProperties;
  className?: string;
}>;

export function Col({ span = 24, style, className, children }: ColProps) {
  const g = useRowGutter();
  const w = `${(Math.max(0, Math.min(24, span)) / 24) * 100}%`;
  return (
    <div
      className={className}
      style={{
        paddingLeft: g ? g / 2 : undefined,
        paddingRight: g ? g / 2 : undefined,
        flex: `0 0 ${w}`,
        maxWidth: w,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
