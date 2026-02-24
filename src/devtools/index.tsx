import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { DevToolsPanel } from './components/devtools-panel';
import { DEVTOOLS_EVENTS, HOTKEY_ACTION, isTypeObject, isTypeString } from './constants';
import {
  emitDevtoolsEvent,
  ensureDevtoolsContainer,
  isDevtoolsCreated,
  markDevtoolsCreated,
} from './devtools-runtime';
import { useDevtoolsHotkeys } from './hooks/useDevtoolsHotkeys';

import type { DevToolsProps } from './components/devtools-panel';

export { Devtools } from './devtools-runtime';

/**
 * Devtools 开发工具入口
 */
export function DevTools(props: DevToolsProps) {
  const propsRef = useRef(props);
  propsRef.current = props;
  const [active, setActive] = useState(isDevtoolsCreated());
  const combo = isTypeString(props.shortcut)
    ? props.shortcut
    : isTypeObject(props.shortcut)
      ? props.shortcut?.combo
      : undefined;
  const action =
    isTypeObject(props.shortcut) && props.shortcut?.action
      ? props.shortcut.action
      : HOTKEY_ACTION.OPEN;

  const activate = (event: string) => {
    if (!ensureDevtoolsContainer()) {
      return;
    }
    if (!isDevtoolsCreated()) {
      markDevtoolsCreated();
      setActive(true);
    }
    emitDevtoolsEvent(event);
  };

  useDevtoolsHotkeys({
    combo,
    action,
    enabled: true,
    onToggle: () => activate(DEVTOOLS_EVENTS.OPEN),
    onClose: () => {
      emitDevtoolsEvent(DEVTOOLS_EVENTS.CLOSE);
      propsRef.current.onClose?.();
    },
    onInspectToggle: () => activate(DEVTOOLS_EVENTS.INSPECT_TOGGLE),
  });

  const container = active ? ensureDevtoolsContainer() : null;
  if (!active || !container) {
    return null;
  }
  return createPortal(<DevToolsPanel {...propsRef.current} />, container);
}
