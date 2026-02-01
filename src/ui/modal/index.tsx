import { type CSSProperties, type PropsWithChildren, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalProps = PropsWithChildren<{
  open: boolean;
  onCancel?: () => void;
  footer?: ReactNode;
  maskClosable?: boolean;
  centered?: boolean;
  width?: number | string;
  styles?: {
    body?: CSSProperties;
    content?: CSSProperties;
    header?: CSSProperties;
  };
}>;

export function Modal({
  open,
  onCancel,
  footer,
  maskClosable = true,
  width = 520,
  styles,
  children,
}: ModalProps) {
  const overlay = open ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onMouseDown={() => {
        if (maskClosable) {
          onCancel?.();
        }
      }}
    >
      <div
        style={{
          width,
          maxWidth: '100%',
          borderRadius: 14,
          border: '1px solid var(--ink-demo-border)',
          background: 'var(--ink-demo-bg-container)',
          overflow: 'hidden',
          ...(styles?.content ?? null),
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ ...(styles?.body ?? null) }}>
          {children}
          {footer === null ? null : footer ? <div>{footer}</div> : null}
        </div>
      </div>
    </div>
  ) : null;
  return open ? createPortal(overlay, document.body) : null;
}
