import {
  Fragment,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

import { ColorText } from './helpers';

import { getCurrentTheme, subscribeTheme } from '@/styles/theme';
import { PopupContainerContext, type GetPopupContainer } from '@/ui/config-provider/context';
import { useGlobalClickDismiss } from '@/ui/helpers/use-global-click-dismiss';
import { InputWithSearch as Input } from '@/ui/input';

export type ColorPickerProps = {
  className?: string;
  style?: CSSProperties;
  value?: string;
  onChange?: (value: string) => void;
  onChangeComplete?: (color: { toHexString: () => string }) => void;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  showText?: boolean;
  getPopupContainer?: GetPopupContainer;
};

export function ColorPicker({
  className,
  style,
  value,
  onChange,
  onChangeComplete,
  disabled,
  size,
  showText = false,
  getPopupContainer,
}: ColorPickerProps) {
  const height = size === 'small' ? 24 : size === 'large' ? 32 : 28;
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const ctxGetPopupContainer = useContext(PopupContainerContext);
  const [themePalette, setThemePalette] = useState(() => getCurrentTheme());

  const hex = ColorText.normalizeHexColor(value);
  const [draft, setDraft] = useState<string>(hex);
  useEffect(() => setDraft(hex), [hex]);

  const apply = (next: string) => {
    const normalized = ColorText.normalizeHexColor(next);
    onChange?.(normalized);
    onChangeComplete?.({ toHexString: () => normalized });
  };

  const updatePos = () => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) {
      return;
    }
    const r = anchor.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const margin = 8;
    let left = r.left;
    let top = r.bottom + margin;
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
  }, [open]);

  useGlobalClickDismiss(open, panelRef.current, () => setOpen(false));

  useEffect(() => {
    return subscribeTheme((t) => setThemePalette(t));
  }, []);

  const presets = useMemo(() => {
    const raw = [
      '#000000',
      '#ffffff',
      themePalette.primary,
      themePalette.secondary,
      themePalette.success,
      themePalette.warning,
      themePalette.danger,
      themePalette.text.primary,
      themePalette.text.secondary,
      themePalette.border.base,
      themePalette.background.base,
    ].filter(Boolean) as string[];
    return Array.from(new Set(raw.map((c) => ColorText.normalizeHexColor(c))));
  }, [
    themePalette.background.base,
    themePalette.border.base,
    themePalette.danger,
    themePalette.primary,
    themePalette.secondary,
    themePalette.success,
    themePalette.text.primary,
    themePalette.text.secondary,
    themePalette.warning,
  ]);

  const overlay = open ? (
    <div
      ref={panelRef}
      className="ink-ui-color-picker-panel"
      style={{
        position: 'fixed',
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        zIndex: 10000,
        borderRadius: 12,
        border: '1px solid var(--ink-demo-border)',
        background: 'var(--ink-demo-bg-container)',
        color: 'var(--ink-demo-text-primary)',
        boxShadow: '0 10px 30px rgb(0 0 0 / 22%)',
        padding: 10,
        width: 220,
        overflow: 'hidden',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div
          style={{
            width: 44,
            height: 32,
            border: '1px solid var(--ink-demo-border)',
            borderRadius: 10,
            overflow: 'hidden',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <input
            type="color"
            value={hex}
            disabled={disabled}
            onChange={(e) => apply(e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'block',
            }}
          />
        </div>
        <Input
          size="small"
          value={draft}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            if (ColorText.isHexColorText(next)) {
              apply(next);
            }
          }}
          onBlur={() => {
            if (ColorText.isHexColorText(draft)) {
              apply(draft);
            } else {
              setDraft(hex);
            }
          }}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(16px, 1fr))',
          justifyItems: 'center',
          gap: 6,
          marginTop: 10,
        }}
      >
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              border:
                c.toLowerCase() === hex.toLowerCase()
                  ? '2px solid var(--ink-demo-primary)'
                  : '1px solid var(--ink-demo-border)',
              background: c,
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: 0,
            }}
            onClick={() => apply(c)}
          />
        ))}
      </div>
    </div>
  ) : null;

  return (
    <Fragment>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        className={[className, 'ink-ui-color-picker', 'ink-ui-color-picker-trigger']
          .filter(Boolean)
          .join(' ')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height,
          border: '1px solid var(--ink-demo-border)',
          background: 'transparent',
          color: 'var(--ink-demo-text-primary)',
          borderRadius: 10,
          padding: '0 8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          ...style,
        }}
        onClick={() => {
          if (disabled) {
            return;
          }
          setOpen((v) => !v);
        }}
      >
        <span
          aria-hidden
          style={{
            width: 14,
            height: 14,
            borderRadius: 3,
            background: hex,
            border: '1px solid var(--ink-demo-border-secondary)',
            display: 'inline-flex',
          }}
        />
        {showText ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{hex}</span> : null}
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
