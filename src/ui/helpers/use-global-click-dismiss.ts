import { useEffect } from 'react';

export function useGlobalClickDismiss(
  open: boolean,
  rootEl: HTMLElement | null,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (!rootEl) {
        onDismiss();
        return;
      }
      const target = e.target as Node | null;
      if (target && rootEl.contains(target)) {
        return;
      }
      onDismiss();
    };
    document.addEventListener('mousedown', onDoc, true);
    return () => document.removeEventListener('mousedown', onDoc, true);
  }, [open, onDismiss, rootEl]);
}
