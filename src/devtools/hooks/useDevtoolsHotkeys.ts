import { useEffect, useMemo, useState } from 'react';

import { DEVTOOLS_DOM_EVENTS, HOTKEY_ACTION } from '../constants';

import { DEVTOOLS_HOTKEY, DEVTOOLS_HOTKEY_DEFAULT } from '@/utils/local-storage';

export type HotkeyAction = (typeof HOTKEY_ACTION)[keyof typeof HOTKEY_ACTION];

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
    () => opts.combo || DEVTOOLS_HOTKEY.get() || DEVTOOLS_HOTKEY_DEFAULT,
    [opts.combo],
  );
  const [combo, setCombo] = useState<string>(defaultCombo);
  const enabled = opts.enabled ?? true;
  const action: HotkeyAction = opts.action ?? HOTKEY_ACTION.OPEN;
  const { onToggle, onClose, onInspectToggle } = opts;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    function onKey(ev: KeyboardEvent) {
      const current = DEVTOOLS_HOTKEY.get() || combo;
      if (matches(ev, current)) {
        ev.preventDefault();
        if (action === HOTKEY_ACTION.TOGGLE || action === HOTKEY_ACTION.OPEN) {
          onToggle?.();
        } else if (action === HOTKEY_ACTION.CLOSE) {
          onClose?.();
        } else if (action === HOTKEY_ACTION.INSPECT) {
          onInspectToggle?.();
        }
      }
    }
    window.addEventListener(DEVTOOLS_DOM_EVENTS.KEYDOWN, onKey);
    return () => window.removeEventListener(DEVTOOLS_DOM_EVENTS.KEYDOWN, onKey);
  }, [combo, enabled, action, onToggle, onClose, onInspectToggle]);

  function updateCombo(next: string) {
    const normalized = normalizeCombo(next);
    setCombo(normalized);
    DEVTOOLS_HOTKEY.set(normalized);
  }

  return { combo, setCombo: updateCombo };
}
