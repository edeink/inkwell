/**
 * 双击可编辑字段
 *
 * 支持点击进入编辑态并处理失焦退出。
 * 注意事项：依赖 DOM 事件监听。
 * 潜在副作用：注册全局 pointerdown 监听。
 */
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useEffect, useRef, type ReactNode } from 'react';

import {
  DEVTOOLS_DOM_EVENT_OPTIONS,
  DEVTOOLS_DOM_EVENTS,
  DEVTOOLS_SELECTORS,
} from '../../constants';

import styles from './index.module.less';

/**
 * DoubleClickEditableField
 *
 * @param props 组件参数
 * @returns React 元素
 * @remarks
 * 注意事项：editable 为 false 时禁止进入编辑态。
 * 潜在副作用：注册 pointerdown 监听与焦点控制。
 */
export const DoubleClickEditableField = observer(function DoubleClickEditableField({
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
  const ui = useLocalObservable(() => ({
    editing: false,
    setEditing(next: boolean) {
      this.editing = next;
    },
  }));
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
    if (!editable && ui.editing) {
      ui.setEditing(false);
    }
  }, [editable, ui]);

  useEffect(() => {
    if (!ui.editing) {
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
  }, [ui.editing]);

  useEffect(() => {
    if (!ui.editing || !exitOnBlur) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const root = rootRef.current;
      if (!isExitTarget(target, root)) {
        return;
      }
      ui.setEditing(false);
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
  }, [exitOnBlur, ui]);

  const handleBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!exitOnBlur || !ui.editing) {
      return;
    }
    const next = e.relatedTarget instanceof HTMLElement ? e.relatedTarget : null;
    if (!isExitTarget(next, e.currentTarget)) {
      return;
    }
    ui.setEditing(false);
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
          ui.editing ? styles.editorActive : styles.editorInactive,
          editorClassName ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {ui.editing
          ? typeof editor === 'function'
            ? editor({ exit: () => ui.setEditing(false), editing: ui.editing })
            : editor
          : null}
      </div>
      <div
        className={[
          styles.display,
          ui.editing ? styles.displayHidden : styles.displayActive,
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
          ui.setEditing(true);
        }}
      >
        {display}
      </div>
    </div>
  );
});
