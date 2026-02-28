import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { DevToolsLoading } from './components/loading';
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

// Lazy load the heavy panel
const LazyDevToolsPanel = lazy(() =>
  // eslint-disable-next-line no-restricted-syntax
  import('./components/devtools-panel').then((module) => ({
    default: module.DevToolsPanel,
  })),
);

type DevtoolsSingletonState = {
  ownerId: string | null;
  mounts: number;
  listeners: Set<() => void>;
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
  const next = { ownerId: null, mounts: 0, listeners: new Set<() => void>() };
  g[key] = next;
  return next;
}

/**
 * Devtools 开发工具入口
 *
 * 负责管理单例状态与懒加载面板。
 * 修复了 HMR 或多实例场景下所有权丢失的问题。
 */
export function DevTools(props: DevToolsProps) {
  const instanceIdRef = useRef(`devtools-${Math.random().toString(36).slice(2)}`);

  // 使用 useSyncExternalStore 或手动订阅模式管理所有权
  const [isOwner, setIsOwner] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldOpen, setShouldOpen] = useState(false);

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
    if (!isLoaded) {
      setIsLoaded(true);
      if (event === DEVTOOLS_EVENTS.OPEN || event === DEVTOOLS_EVENTS.INSPECT_TOGGLE) {
        setShouldOpen(true);
      }
    }
    if (!isDevtoolsCreated()) {
      markDevtoolsCreated();
    }
    emitDevtoolsEvent(event);
  };

  // 尝试获取所有权
  const tryClaimOwnership = () => {
    const state = getSingletonState();
    if (!state) {
      return false;
    }

    if (!state.ownerId) {
      state.ownerId = instanceIdRef.current;
      return true;
    }
    return state.ownerId === instanceIdRef.current;
  };

  useEffect(() => {
    const state = getSingletonState();
    if (!state) {
      return;
    }

    const instanceId = instanceIdRef.current;

    // 注册监听器，当所有权释放时尝试获取
    const checkOwnership = () => {
      if (tryClaimOwnership()) {
        setIsOwner(true);
      }
    };

    state.listeners.add(checkOwnership);
    state.mounts += 1;

    // 立即尝试获取
    checkOwnership();

    return () => {
      state.listeners.delete(checkOwnership);
      state.mounts = Math.max(0, state.mounts - 1);

      if (state.ownerId === instanceId) {
        state.ownerId = null;
        setIsOwner(false);
        // 通知其他监听者尝试获取
        state.listeners.forEach((listener) => listener());
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
  if (!isLoaded) {
    return null;
  }
  const container = ensureDevtoolsContainer();
  if (!container) {
    return null;
  }
  return createPortal(
    <Suspense fallback={<DevToolsLoading />}>
      <LazyDevToolsPanel {...propsRef.current} defaultOpen={shouldOpen} />
    </Suspense>,
    container,
  );
}
