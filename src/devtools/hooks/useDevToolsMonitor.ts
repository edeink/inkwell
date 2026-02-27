/**
 * DevTools 状态监控 Hook
 *
 * 负责监听 Runtime 树结构变化、页面可见性，并驱动 Store 更新。
 * 使用 requestIdleCallback 进行低优先级轮询。
 */
import { useEffect, useRef } from 'react';

import { computeRuntimeTreeHash } from '../helper/tree';
import { usePanelStore } from '../store';

export function useDevToolsMonitor() {
  const runtime = usePanelStore((state) => state.runtime);
  const visible = usePanelStore((state) => state.visible);

  // 使用 ref 避免闭包陷阱
  const lastTreeHashRef = useRef(0);
  const isPollingRef = useRef(false);
  const idleIdRef = useRef<number | null>(null);
  const timerIdRef = useRef<number | null>(null);

  // 同步 store 中的 hash
  useEffect(() => {
    return usePanelStore.subscribe((state) => {
      lastTreeHashRef.current = state.lastTreeHash;
    });
  }, []);

  useEffect(() => {
    // 页面可见性监听
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      usePanelStore.getState().setIsPageVisible(isVisible);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!visible || !runtime) {
      isPollingRef.current = false;
      if (idleIdRef.current) {
        cancelIdleCallback(idleIdRef.current);
      }
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
      return;
    }

    isPollingRef.current = true;

    const checkHash = () => {
      if (!isPollingRef.current) {
        return;
      }

      // 检查页面可见性
      if (document.hidden) {
        schedule();
        return;
      }

      // 检查 Runtime 有效性
      if (!runtime.getCanvasId?.() || !runtime.container) {
        schedule();
        return;
      }

      try {
        const nextHash = computeRuntimeTreeHash(runtime);
        if (nextHash !== lastTreeHashRef.current) {
          lastTreeHashRef.current = nextHash;

          // 批量更新 Store
          const store = usePanelStore.getState();
          usePanelStore.setState({ lastTreeHash: nextHash });
          store.bumpVersion();
          store.updateTreeBuild();
        }
      } catch (e) {
        console.error('[DevTools] Tree Hash Check Failed:', e);
      }

      schedule();
    };

    const schedule = () => {
      if (!isPollingRef.current) {
        return;
      }

      // 优先使用 requestIdleCallback
      if (typeof requestIdleCallback !== 'undefined') {
        idleIdRef.current = requestIdleCallback(
          () => {
            idleIdRef.current = null;
            checkHash();
          },
          { timeout: 500 },
        );
      } else {
        timerIdRef.current = window.setTimeout(() => {
          timerIdRef.current = null;
          checkHash();
        }, 500);
      }
    };

    schedule();

    return () => {
      isPollingRef.current = false;
      if (idleIdRef.current) {
        cancelIdleCallback(idleIdRef.current);
      }
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, [visible, runtime]);
}
