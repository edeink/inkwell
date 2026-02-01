import { type CSSProperties, type PropsWithChildren } from 'react';

export type SpaceCompactProps = PropsWithChildren<{ className?: string; style?: CSSProperties }>;

export function SpaceCompact({ className, style, children }: SpaceCompactProps) {
  return (
    <div className={className} style={{ display: 'inline-flex', ...style }}>
      {children}
    </div>
  );
}
