import type { CSSProperties } from 'react';

import { getCurrentThemeMode, type ThemePalette } from '@/styles/theme';

type ExportActionsProps = {
  exporting: boolean;
  theme: ThemePalette;
  onExport: (format: 'png' | 'pdf') => void;
};

export function ExportActions(props: ExportActionsProps) {
  const { exporting, theme, onExport } = props;

  const buttonStyle = (disabled: boolean): CSSProperties => {
    const mode = getCurrentThemeMode();
    const background = theme.background.container;
    const shadow =
      mode === 'dark' ? '0 12px 28px rgba(0,0,0,0.55)' : '0 12px 28px rgba(0,0,0,0.18)';
    return {
      padding: '10px 12px',
      borderRadius: 10,
      border: `1px solid ${theme.border.base}`,
      background,
      color: theme.text.primary,
      boxShadow: shadow,
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    };
  };

  return (
    <div
      style={{ position: 'fixed', right: 24, bottom: 24, display: 'flex', gap: 10, zIndex: 1000 }}
    >
      <button
        type="button"
        disabled={exporting}
        onClick={() => onExport('png')}
        style={buttonStyle(exporting)}
      >
        导出 PNG
      </button>
      <button
        type="button"
        disabled={exporting}
        onClick={() => onExport('pdf')}
        style={buttonStyle(exporting)}
      >
        导出 PDF
      </button>
    </div>
  );
}
