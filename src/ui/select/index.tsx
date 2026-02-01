import {
  Fragment,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { PopupContainerContext, type GetPopupContainer } from '@/ui/config-provider/context';
import { useGlobalClickDismiss } from '@/ui/helpers/use-global-click-dismiss';
import { CaretDownOutlined } from '@/ui/icons';

export type SelectOption = { label: ReactNode; value: string };
export type SelectProps = {
  className?: string;
  style?: CSSProperties;
  value?: string | number | boolean;
  options?: Array<{ label: ReactNode; value: string | number | boolean }>;
  onChange?: (value: string | number | boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  bordered?: boolean;
  placeholder?: string;
  popupMatchSelectWidth?: boolean;
  getPopupContainer?: GetPopupContainer;
  autoOpen?: boolean;
};

export function Select({
  className,
  style,
  value,
  options,
  onChange,
  disabled,
  size,
  bordered = true,
  placeholder,
  popupMatchSelectWidth = true,
  getPopupContainer,
  autoOpen,
}: SelectProps) {
  const height = size === 'small' ? 26 : size === 'large' ? 32 : 28;
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const ctxGetPopupContainer = useContext(PopupContainerContext);

  const valueStr = value == null ? '' : String(value);
  const resolvedOptions = options ?? [];
  const selected = resolvedOptions.find((opt) => String(opt.value) === valueStr) ?? null;
  const displayLabel =
    selected?.label ?? (valueStr ? valueStr : placeholder ? placeholder : '请选择');
  const isPlaceholder = selected == null && !valueStr;

  const updatePos = () => {
    const anchor = anchorRef.current;
    const drop = dropdownRef.current;
    if (!anchor || !drop) {
      return;
    }
    const r = anchor.getBoundingClientRect();
    const dr = drop.getBoundingClientRect();
    const margin = 6;
    let left = r.left;
    let top = r.bottom + margin;
    const width = r.width;
    left = Math.max(8, Math.min(left, window.innerWidth - dr.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - dr.height - 8));
    setPos({ left, top, width });
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
  }, [open]);

  useEffect(() => {
    if (!autoOpen || disabled) {
      return;
    }
    setOpen(true);
  }, [autoOpen, disabled]);

  useGlobalClickDismiss(open, dropdownRef.current, () => setOpen(false));

  const overlay = open ? (
    <div
      ref={dropdownRef}
      className="ink-ui-select-dropdown"
      style={{
        position: 'fixed',
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        zIndex: 10000,
        minWidth: popupMatchSelectWidth ? (pos?.width ?? 160) : 160,
        maxWidth: 420,
        borderRadius: 12,
        border: '1px solid var(--ink-demo-border)',
        background: 'var(--ink-demo-bg-container)',
        color: 'var(--ink-demo-text-primary)',
        boxShadow: '0 10px 30px rgb(0 0 0 / 22%)',
        padding: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {resolvedOptions.map((opt) => {
        const key = String(opt.value);
        const isSelected = key === valueStr;
        return (
          <button
            key={key}
            type="button"
            style={{
              appearance: 'none',
              border: '1px solid transparent',
              background: isSelected
                ? 'color-mix(in srgb, var(--ink-demo-primary), transparent 90%)'
                : 'transparent',
              color: 'inherit',
              textAlign: 'left',
              padding: '6px 10px',
              borderRadius: 10,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onClick={() => {
              onChange?.(opt.value);
              setOpen(false);
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <Fragment>
      <button
        ref={anchorRef}
        type="button"
        className={[className, 'ink-ui-select', 'ink-ui-select-trigger'].filter(Boolean).join(' ')}
        style={{
          width: '100%',
          minWidth: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          height,
          padding: '0 10px',
          borderRadius: 10,
          border: bordered ? '1px solid var(--ink-demo-border)' : '1px solid transparent',
          background: 'var(--ink-demo-bg-container)',
          color: isPlaceholder
            ? 'var(--ink-demo-text-placeholder)'
            : 'var(--ink-demo-text-primary)',
          fontSize: 14,
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          ...style,
        }}
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }
          setOpen((v) => !v);
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <span style={{ color: 'var(--ink-demo-text-secondary)', display: 'inline-flex' }}>
          <CaretDownOutlined style={{ fontSize: 12 }} />
        </span>
      </button>
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
