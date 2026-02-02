import { useEffect, useMemo, useState } from 'react';

export type HotkeyAction = 'toggle' | 'inspect' | 'close';

export interface DevtoolsHotkeysOptions {
  combo?: string;
  action?: HotkeyAction;
  enabled?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  onInspectToggle?: () => void;
}

function normalizeCombo(raw: string) {
  return raw
    .split('+')
    .map((t) => t.trim())
    .filter(Boolean)
    .join('+');
}

function matches(ev: KeyboardEvent, comboStr: string): boolean {
  const parts = normalizeCombo(comboStr).split('+');
  const needShift = parts.includes('Shift');
  const needAlt = parts.includes('Alt') || parts.includes('Option');
  const needCtrlBase = parts.includes('Ctrl') || parts.includes('Control');
  const needMetaBase = parts.includes('Cmd') || parts.includes('Command') || parts.includes('Meta');
  const needCmdOrCtrl = parts.includes('CmdOrCtrl');
  const platStr =
    typeof navigator !== 'undefined' ? navigator.platform || navigator.userAgent || '' : '';
  let isMac: boolean = false;
  if (platStr) {
    isMac = /Mac|iPhone|iPad|iPod/i.test(platStr);
  }
  // CmdOrCtrl 的跨平台映射策略：
  // - 在 macOS 上视为必须按下 Meta(Command) 键
  // - 在 Windows/Linux 上视为必须按下 Ctrl 键
  // - 若同时显式声明了 Ctrl/Cmd，则依平台映射后仍需满足显式声明
  const needCtrl = needCtrlBase || (!needMetaBase && needCmdOrCtrl && !isMac);
  const needMeta = needMetaBase || (!needCtrlBase && needCmdOrCtrl && isMac);
  const keyPart = parts.find(
    (p) =>
      ![
        'Shift',
        'Alt',
        'Option',
        'Ctrl',
        'Control',
        'Cmd',
        'Command',
        'Meta',
        'CmdOrCtrl',
      ].includes(p),
  );
  const keyMatch = keyPart ? ev.key.toLowerCase() === keyPart.toLowerCase() : true;
  const modOk =
    !!needShift === !!ev.shiftKey &&
    !!needAlt === !!ev.altKey &&
    !!needCtrl === !!ev.ctrlKey &&
    !!needMeta === !!ev.metaKey &&
    (!needCmdOrCtrl || (isMac ? !!ev.metaKey : !!ev.ctrlKey));
  return keyMatch && modOk;
}

export function useDevtoolsHotkeys(opts: DevtoolsHotkeysOptions) {
  const defaultCombo = useMemo(
    () => opts.combo || localStorage.getItem('INKWELL_DEVTOOLS_HOTKEY') || 'CmdOrCtrl+Shift+D',
    [opts.combo],
  );
  const [combo, setCombo] = useState<string>(defaultCombo);
  const enabled = opts.enabled ?? true;
  const action: HotkeyAction = opts.action ?? 'toggle';
  const { onToggle, onClose, onInspectToggle } = opts;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    function onKey(ev: KeyboardEvent) {
      const current = localStorage.getItem('INKWELL_DEVTOOLS_HOTKEY') || combo;
      if (matches(ev, current)) {
        ev.preventDefault();
        if (action === 'toggle') {
          onToggle?.();
        } else if (action === 'close') {
          onClose?.();
        } else if (action === 'inspect') {
          onInspectToggle?.();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, enabled, action, onToggle, onClose, onInspectToggle]);

  function updateCombo(next: string) {
    const normalized = normalizeCombo(next);
    setCombo(normalized);
    localStorage.setItem('INKWELL_DEVTOOLS_HOTKEY', normalized);
  }

  return { combo, setCombo: updateCombo };
}
