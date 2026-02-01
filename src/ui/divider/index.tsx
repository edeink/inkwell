import { type CSSProperties } from 'react';

export type DividerProps = { style?: CSSProperties; className?: string };

export function Divider({ style, className }: DividerProps) {
  return (
    <div
      className={className}
      style={{
        height: 1,
        width: '100%',
        background: 'var(--ink-demo-border)',
        ...style,
      }}
    />
  );
}
