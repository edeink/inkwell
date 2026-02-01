import { type PropsWithChildren, type ReactNode } from 'react';

export type TooltipProps = PropsWithChildren<{
  title?: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}>;

export function Tooltip({ title, children }: TooltipProps) {
  const titleText =
    typeof title === 'string' || typeof title === 'number' ? String(title) : undefined;
  return (
    <span title={titleText} style={{ display: 'inline-flex' }}>
      {children}
    </span>
  );
}
