import {
  Fragment,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { PopupContainerContext, type GetPopupContainer } from '@/ui/config-provider/context';
import { useGlobalClickDismiss } from '@/ui/helpers/use-global-click-dismiss';

type OverlayPlacement = 'top' | 'bottom' | 'left' | 'right';

export type PopoverProps = PropsWithChildren<{
  content?: ReactNode;
  title?: ReactNode;
  trigger?: 'click' | 'hover';
  placement?: OverlayPlacement;
  overlayClassName?: string;
  getPopupContainer?: GetPopupContainer;
}>;

export function Popover({
  content,
  title,
  trigger = 'click',
  placement = 'bottom',
  overlayClassName,
  getPopupContainer,
  children,
}: PopoverProps) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const ctxGetPopupContainer = useContext(PopupContainerContext);

  const updatePos = () => {
    const anchor = anchorRef.current;
    const pop = popoverRef.current;
    if (!anchor || !pop) {
      return;
    }
    const r = anchor.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    const margin = 8;
    let left = r.left;
    let top = r.bottom + margin;
    if (placement === 'top') {
      top = r.top - pr.height - margin;
    } else if (placement === 'left') {
      left = r.left - pr.width - margin;
      top = r.top;
    } else if (placement === 'right') {
      left = r.right + margin;
      top = r.top;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - pr.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - pr.height - 8));
    setPos({ left, top });
  };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    updatePos();
    const onResize = () => updatePos();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, placement]);

  useGlobalClickDismiss(open, popoverRef.current, () => setOpen(false));

  const overlay = open ? (
    <div
      ref={popoverRef}
      className={overlayClassName}
      style={{
        position: 'fixed',
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        zIndex: 9999,
        minWidth: 160,
        maxWidth: 360,
        borderRadius: 12,
        border: '1px solid var(--ink-demo-border)',
        background: 'var(--ink-demo-bg-container)',
        color: 'var(--ink-demo-text-primary)',
        boxShadow: '0 10px 30px rgb(0 0 0 / 22%)',
        padding: 10,
      }}
    >
      {title ? <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div> : null}
      {content}
    </div>
  ) : null;

  const child = (
    <span
      ref={anchorRef}
      style={{ display: 'inline-flex' }}
      onClick={
        trigger === 'click'
          ? () => {
              setOpen((v) => !v);
            }
          : undefined
      }
      onMouseEnter={trigger === 'hover' ? () => setOpen(true) : undefined}
      onMouseLeave={trigger === 'hover' ? () => setOpen(false) : undefined}
    >
      {children}
    </span>
  );

  return (
    <Fragment>
      {child}
      {open
        ? createPortal(
            overlay,
            (getPopupContainer ?? ctxGetPopupContainer)?.(anchorRef.current ?? undefined) ??
              document.body,
          )
        : null}
    </Fragment>
  );
}
