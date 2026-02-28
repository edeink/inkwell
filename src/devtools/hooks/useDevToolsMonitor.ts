/**
 * DevTools 状态监控 Hook
 *
 * 负责监听 Runtime 树结构变化、页面可见性，并驱动 Store 更新。
 * 使用 requestIdleCallback 进行低优先级轮询。
 */
import { useEffect, useRef } from 'react';

import { computeWidgetTreeHash } from '../helper/tree';
import { usePanelStore } from '../store';

export function useDevToolsMonitor() {
  const runtime = usePanelStore((state) => state.runtime);
  const visible = usePanelStore((state) => state.visible);

  const lastTreeHashRef = useRef(0);
  const lastRootHashRef = useRef(0);
  const lastOverlayHashRef = useRef(0);
  const isPollingRef = useRef(false);
  const idleIdRef = useRef<number | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const rateLimitRef = useRef({ count: 0, startTime: Date.now() });

  // 同步 store 中的 hash
  useEffect(() => {
    console.log('[useDevToolsMonitor] Mount');
    return () => console.log('[useDevToolsMonitor] Unmount');
  }, []);

  useEffect(() => {
    return usePanelStore.subscribe((state) => {
      // Debug: Log if lastTreeHash is a float or unexpected
      if (state.lastTreeHash !== 0 && !Number.isInteger(state.lastTreeHash)) {
        console.warn('[useDevToolsMonitor] State lastTreeHash is float:', state.lastTreeHash);
      }
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
    // 重置计数器 (每次 visible/runtime 变化时重置，但保留 total limit 防止死循环)
    // 这里我们使用一个简单的策略：如果短时间内更新次数过多，则停止

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
        const rootHash = computeWidgetTreeHash(runtime.getRootWidget?.() ?? null);
        const overlayHash = computeWidgetTreeHash(runtime.getOverlayRootWidget?.() ?? null);

        // 手动组合，与 tree.ts 保持一致
        let h = rootHash;
        h ^= overlayHash >>> 0;
        const nextHash = Math.imul(h, 16777619) >>> 0;

        if (nextHash !== lastTreeHashRef.current) {
          // Rate limiting logic
          const now = Date.now();
          if (now - rateLimitRef.current.startTime > 5000) {
            rateLimitRef.current = { count: 0, startTime: now };
          }
          rateLimitRef.current.count++;

          if (rateLimitRef.current.count > 50) {
            console.warn(
              '[DevTools Monitor] Infinite loop detected (>50 updates in 5s). Stopping monitor.',
            );
            isPollingRef.current = false;
            return;
          }

          console.log('[DevTools Monitor] Tree Hash Changed:', {
            old: lastTreeHashRef.current,
            new: nextHash,
            rootHash,
            overlayHash,
            oldRootHash: lastRootHashRef.current,
            oldOverlayHash: lastOverlayHashRef.current,
            runtimeId: runtime.getCanvasId?.(),
          });
          lastTreeHashRef.current = nextHash;
          lastRootHashRef.current = rootHash;
          lastOverlayHashRef.current = overlayHash;

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
