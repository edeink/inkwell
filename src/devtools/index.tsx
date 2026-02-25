import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { DevToolsPanel } from './components/devtools-panel';
import {
  DEVTOOLS_EVENTS,
  DEVTOOLS_GLOBAL,
  HOTKEY_ACTION,
  isTypeObject,
  isTypeString,
} from './constants';
import {
  emitDevtoolsEvent,
  ensureDevtoolsContainer,
  isDevtoolsCreated,
  markDevtoolsCreated,
} from './devtools-runtime';
import { useDevtoolsHotkeys } from './hooks/useDevtoolsHotkeys';

import type { DevToolsProps } from './components/devtools-panel';

export { Devtools } from './devtools-runtime';

type DevtoolsSingletonState = {
  ownerId: string | null;
  mounts: number;
};

function getSingletonState(): DevtoolsSingletonState | null {
  if (typeof globalThis === 'undefined') {
    return null;
  }
  const key = DEVTOOLS_GLOBAL.STATE_KEY;
  const g = globalThis as typeof globalThis & { [key: string]: DevtoolsSingletonState | undefined };
  const existing = g[key];
  if (existing) {
    return existing;
  }
  const next = { ownerId: null, mounts: 0 };
  g[key] = next;
  return next;
}

/**
 * Devtools 开发工具入口
 */
export function DevTools(props: DevToolsProps) {
  const instanceIdRef = useRef(`devtools-${Math.random().toString(36).slice(2)}`);
  const [isOwner, setIsOwner] = useState(() => {
    const state = getSingletonState();
    if (!state) {
      return true;
    }
    if (!state.ownerId) {
      state.ownerId = instanceIdRef.current;
    }
    return state.ownerId === instanceIdRef.current;
  });
  const propsRef = useRef(props);
  propsRef.current = props;
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
    }
    emitDevtoolsEvent(event);
  };

  useEffect(() => {
    const state = getSingletonState();
    if (!state) {
      return;
    }
    const instanceId = instanceIdRef.current;
    state.mounts += 1;
    if (!state.ownerId) {
      state.ownerId = instanceId;
      if (state.ownerId === instanceId) {
        setIsOwner(true);
      }
    }
    return () => {
      state.mounts = Math.max(0, state.mounts - 1);
      if (state.ownerId === instanceId) {
        state.ownerId = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOwner) {
      return;
    }
    if (!ensureDevtoolsContainer()) {
      return;
    }
    if (!isDevtoolsCreated()) {
      markDevtoolsCreated();
    }
  }, [isOwner]);

  useDevtoolsHotkeys({
    combo,
    action,
    enabled: isOwner,
    onToggle: () => activate(DEVTOOLS_EVENTS.OPEN),
    onClose: () => {
      emitDevtoolsEvent(DEVTOOLS_EVENTS.CLOSE);
      propsRef.current.onClose?.();
    },
    onInspectToggle: () => activate(DEVTOOLS_EVENTS.INSPECT_TOGGLE),
  });

  if (!isOwner) {
    return null;
  }
  const container = ensureDevtoolsContainer();
  if (!container) {
    return null;
  }
  return createPortal(<DevToolsPanel {...propsRef.current} />, container);
}
