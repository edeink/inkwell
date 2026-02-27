/**
 * DevTools 交互逻辑 Hook
 *
 * 负责处理全局鼠标交互、运行时检测与命中测试。
 * 替代原有的 DevToolsInteraction 类，解决状态更新循环问题。
 */
import { throttle } from 'lodash-es';
import { useEffect, useRef } from 'react';

import { DEVTOOLS_DOM_EVENT_OPTIONS, DEVTOOLS_DOM_EVENTS, DEVTOOLS_DOM_TAGS } from '../constants';
import { resolveHitWidget } from '../helper/resolve';
import { usePanelStore } from '../store';

import type { Widget } from '@/core/base';

import { hitTest } from '@/core/helper/hit-test';
import Runtime from '@/runtime';

export function useDevToolsInteraction() {
  const visible = usePanelStore((state) => state.visible);
  const activeInspect = usePanelStore((state) => state.activeInspect);

  // 使用 ref 避免闭包陷阱
  const storeRef = useRef(usePanelStore.getState());
  useEffect(() => {
    return usePanelStore.subscribe((state) => {
      storeRef.current = state;
    });
  }, []);

  useEffect(() => {
    if (!visible || !activeInspect) {
      return;
    }

    const handleMouseMove = throttle(
      (e: MouseEvent) => {
        const store = storeRef.current;
        const { runtime, isMultiRuntime, runtimeId } = store;
        const cx = e.clientX;
        const cy = e.clientY;

        // 1. 运行时检测
        const list = Runtime.listCanvas();
        const nextMulti = list.length > 1;
        if (nextMulti !== isMultiRuntime) {
          store.setIsMultiRuntime(nextMulti);
        }

        let targetRuntime: Runtime | null = null;
        let overCanvas = false;

        // 查找当前鼠标下的 Canvas
        for (const item of list) {
          const r = item.canvas.getBoundingClientRect();
          if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
            const elAt = document.elementFromPoint(cx, cy);
            if (elAt === item.canvas) {
              overCanvas = true;
              targetRuntime = item.runtime;
              break;
            }
          }
        }

        if (!overCanvas) {
          if (store.inspectHoverWidget) {
            store.setInspectHoverWidget(null);
          }
          return;
        }

        // 2. 切换 Runtime (如果需要)
        if (targetRuntime && targetRuntime !== runtime) {
          store.setRuntime(targetRuntime);
        }

        const activeRuntime = targetRuntime || runtime;
        if (!activeRuntime) {
          return;
        }

        // 检查 ID 变更
        const newId = activeRuntime.getCanvasId?.() ?? null;
        if (newId !== runtimeId) {
          store.setRuntimeId(newId);
        }

        // 3. 命中测试 (Hit Test)
        const renderer = activeRuntime.getRenderer();
        const rawInstance = renderer?.getRawInstance?.();
        const canvas =
          (rawInstance as { canvas?: HTMLCanvasElement })?.canvas ??
          activeRuntime.container?.querySelector(DEVTOOLS_DOM_TAGS.CANVAS);

        if (!canvas) {
          return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = cx - rect.left;
        const y = cy - rect.top;

        const root = activeRuntime.getRootWidget?.();
        const overlayRoot = activeRuntime.getOverlayRootWidget?.() ?? null;

        if (root) {
          try {
            let rawTarget: Widget | null = null;
            if (overlayRoot) {
              rawTarget = hitTest(overlayRoot, x, y);
            }
            if (!rawTarget) {
              rawTarget = hitTest(root, x, y);
            }
            const finalTarget = resolveHitWidget(root, rawTarget, overlayRoot);

            if (finalTarget !== store.inspectHoverWidget) {
              store.setInspectHoverWidget(finalTarget);
            }
          } catch (err) {
            console.error('[DevTools] Hit Test Failed:', err);
          }
        }
      },
      16,
      { trailing: true },
    );

    window.addEventListener(
      DEVTOOLS_DOM_EVENTS.MOUSEMOVE,
      handleMouseMove,
      DEVTOOLS_DOM_EVENT_OPTIONS.PASSIVE_TRUE,
    );

    return () => {
      window.removeEventListener(DEVTOOLS_DOM_EVENTS.MOUSEMOVE, handleMouseMove);
      handleMouseMove.cancel();
    };
  }, [visible, activeInspect]);

  useEffect(() => {
    if (!visible || !activeInspect) {
      return;
    }

    const handleClick = (e: MouseEvent) => {
      const store = usePanelStore.getState();
      if (store.inspectHoverWidget) {
        e.preventDefault();
        e.stopPropagation();
        store.setPickedWidget(store.inspectHoverWidget);
        store.setInspectHoverWidget(null);
      }
    };

    window.addEventListener(DEVTOOLS_DOM_EVENTS.CLICK, handleClick, { capture: true });
    return () => {
      window.removeEventListener(DEVTOOLS_DOM_EVENTS.CLICK, handleClick, { capture: true });
    };
  }, [visible, activeInspect]);
}
