import { create } from 'zustand';

import { DEVTOOLS_HOTKEY, DEVTOOLS_HOTKEY_DEFAULT } from '@/utils/local-storage';

/**
 * Devtools 快捷键状态 Hook
 *
 * 管理快捷键配置与持久化。
 */
interface HotkeyState {
  combo: string;
  setCombo: (next: string) => void;
}

export const useHotkeyStore = create<HotkeyState>((set) => ({
  combo: DEVTOOLS_HOTKEY.get() ?? DEVTOOLS_HOTKEY_DEFAULT,
  setCombo: (next) => {
    DEVTOOLS_HOTKEY.set(next);
    set({ combo: next });
  },
}));
