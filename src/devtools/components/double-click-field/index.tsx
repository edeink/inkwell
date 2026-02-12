import { useEffect, useRef, useState, type ReactNode } from 'react';

import {
  DEVTOOLS_DOM_EVENT_OPTIONS,
  DEVTOOLS_DOM_EVENTS,
  DEVTOOLS_SELECTORS,
} from '../../constants';

import styles from './index.module.less';

/**
 * 双击可编辑字段组件
 */
export function DoubleClickEditableField({
  editor,
  display,
  editable = true,
  exitOnBlur = true,
  className,
  displayClassName,
  editorClassName,
}: {
  editor: ReactNode | ((actions: { exit: () => void; editing: boolean }) => ReactNode);
  display: ReactNode;
  editable?: boolean;
  exitOnBlur?: boolean;
  className?: string;
  displayClassName?: string;
  editorClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isExitTarget = (target: HTMLElement | null, root: HTMLElement | null) => {
    if (!target) {
      return true;
    }
    if (root && root.contains(target)) {
      return false;
    }
    if (
      target.closest(DEVTOOLS_SELECTORS.UI_SELECT_DROPDOWN) ||
      target.closest(DEVTOOLS_SELECTORS.UI_SELECT_ROOT) ||
      target.closest(DEVTOOLS_SELECTORS.UI_COLOR_PICKER_PANEL) ||
      target.closest(DEVTOOLS_SELECTORS.UI_COLOR_PICKER_ROOT)
    ) {
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!editable && editing) {
      setEditing(false);
    }
  }, [editable, editing]);

  useEffect(() => {
    if (!editing) {
      return;
    }
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const target = root.querySelector(DEVTOOLS_SELECTORS.EDITABLE_FOCUSABLE) as HTMLElement | null;
    if (target && typeof target.focus === 'function') {
      target.focus();
      if ('select' in target && typeof (target as HTMLInputElement).select === 'function') {
        (target as HTMLInputElement).select();
      }
    }
  }, [editing]);

  useEffect(() => {
    if (!editing || !exitOnBlur) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const root = rootRef.current;
      if (!isExitTarget(target, root)) {
        return;
      }
      setEditing(false);
    };
    document.addEventListener(
      DEVTOOLS_DOM_EVENTS.POINTERDOWN,
      handlePointerDown,
      DEVTOOLS_DOM_EVENT_OPTIONS.CAPTURE_TRUE,
    );
    return () =>
      document.removeEventListener(
        DEVTOOLS_DOM_EVENTS.POINTERDOWN,
        handlePointerDown,
        DEVTOOLS_DOM_EVENT_OPTIONS.CAPTURE_TRUE,
      );
  }, [editing, exitOnBlur]);

  const handleBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!exitOnBlur || !editing) {
      return;
    }
    const next = e.relatedTarget instanceof HTMLElement ? e.relatedTarget : null;
    if (!isExitTarget(next, e.currentTarget)) {
      return;
    }
    setEditing(false);
  };

  return (
    <div
      ref={rootRef}
      className={[styles.field, className ?? ''].filter(Boolean).join(' ')}
      onBlurCapture={handleBlurCapture}
    >
      <div
        className={[
          styles.editor,
          editing ? styles.editorActive : styles.editorInactive,
          editorClassName ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {editing
          ? typeof editor === 'function'
            ? editor({ exit: () => setEditing(false), editing })
            : editor
          : null}
      </div>
      <div
        className={[
          styles.display,
          editing ? styles.displayHidden : styles.displayActive,
          editable ? styles.displayEditable : styles.displayReadonly,
          displayClassName ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        onDoubleClick={(e) => {
          if (!editable) {
            return;
          }
          e.stopPropagation?.();
          setEditing(true);
        }}
      >
        {display}
      </div>
    </div>
  );
}
