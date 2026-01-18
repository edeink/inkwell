import type { CSSProperties, MouseEvent } from 'react';

export function LayoutResizeHandle({
  className,
  cursor,
  onResizeMouseDown,
}: {
  className: string;
  cursor: CSSProperties['cursor'];
  onResizeMouseDown: (e: MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={(e) => {
        try {
          e.stopPropagation();
        } catch {
          void 0;
        }
        onResizeMouseDown(e);
      }}
      className={className}
      style={{ cursor }}
    />
  );
}
