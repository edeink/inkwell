/**
 * Devtools 快捷键 Hook
 *
 * 负责在页面级监听快捷键并触发对应动作。
 * 注意事项：仅在浏览器环境生效。
 * 潜在副作用：注册全局键盘事件监听。
 */
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { DEVTOOLS_DOM_EVENTS, HOTKEY_ACTION } from '../constants';
import { useHotkeyStore } from '../store';

import { DEVTOOLS_HOTKEY, DEVTOOLS_HOTKEY_DEFAULT } from '@/utils/local-storage';

/**
 * 快捷键动作类型
 *
 * 注意事项：与 HOTKEY_ACTION 常量保持一致。
 * 潜在副作用：无。
 */
export type HotkeyAction = (typeof HOTKEY_ACTION)[keyof typeof HOTKEY_ACTION];

/**
 * 快捷键 Hook 配置
 *
 * 注意事项：未传 combo 时使用本地存储配置。
 * 潜在副作用：无。
 */
export interface DevtoolsHotkeysOptions {
  combo?: string;
  action?: HotkeyAction;
  enabled?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  onInspectToggle?: () => void;
}

/**
 * 规范化快捷键组合字符串
 *
 * @param raw 原始组合字符串
 * @returns 规范化后的组合字符串
 * @remarks
 * 注意事项：会移除多余空格与空片段。
 * 潜在副作用：无。
 */
function normalizeCombo(raw: string) {
  return raw
    .split('+')
    .map((t) => t.trim())
    .filter(Boolean)
    .join('+');
}

/**
 * 判断键盘事件是否匹配组合键
 *
 * @param ev 键盘事件
 * @param comboStr 组合键字符串
 * @returns 是否命中
 * @remarks
 * 注意事项：支持 CmdOrCtrl 的跨平台映射。
 * 潜在副作用：无。
 */
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

/**
 * useDevtoolsHotkeys
 *
 * @param opts 快捷键配置
 * @returns 当前 combo 与更新函数
 * @remarks
 * 注意事项：enabled 为 false 时不会注册事件监听。
 * 潜在副作用：会注册并移除 window 的 keydown 监听。
 */
export function useDevtoolsHotkeys(opts: DevtoolsHotkeysOptions) {
  const { combo: storeCombo, setCombo: storeSetCombo } = useHotkeyStore(
    useShallow((state) => ({ combo: state.combo, setCombo: state.setCombo })),
  );

  const defaultCombo = useMemo(
    () => opts.combo || DEVTOOLS_HOTKEY.get() || DEVTOOLS_HOTKEY_DEFAULT,
    [opts.combo],
  );
  const combo = opts.combo ?? storeCombo ?? defaultCombo;
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

  /**
   * 更新快捷键组合
   *
   * @param next 新组合键
   * @returns void
   * @remarks
   * 注意事项：会对组合键做规范化处理。
   * 潜在副作用：写入 hotkey store。
   */
  function updateCombo(next: string) {
    const normalized = normalizeCombo(next);
    storeSetCombo(normalized);
  }

  return { combo, setCombo: updateCombo };
}
