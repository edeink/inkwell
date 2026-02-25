/**
 * Devtools 鼠标交互 Hook
 *
 * 处理鼠标移动、拾取、悬停同步与多运行时提示。
 * 注意事项：依赖 Runtime、Overlay 与 DOM 环境。
 * 潜在副作用：注册全局事件监听、读取 DOM。
 */
import { throttle } from 'lodash-es';
import { useEffect, useRef } from 'react';

import Runtime from '../../runtime';
import { hitTest } from '../components/overlay';
import {
  DEVTOOLS_DOM_EVENT_OPTIONS,
  DEVTOOLS_DOM_EVENTS,
  DEVTOOLS_DOM_TAGS,
  DEVTOOLS_LOG,
} from '../constants';
import { resolveHitWidget } from '../helper/resolve';

import type { Widget } from '@/core/base';
import type { DevtoolsPanelStore } from '@/devtools/store/panel-store';

/**
 * useMouseInteraction
 *
 * @param panel 面板状态实例
 * @returns 鼠标交互相关状态快照
 * @remarks
 * 注意事项：需在浏览器环境调用。
 * 潜在副作用：注册 window/document 事件监听与 RAF。
 */
export function useMouseInteraction(
  panel: DevtoolsPanelStore,
  enabled: boolean = true,
): {
  runtimeId: string | null;
  isMultiRuntime: boolean;
  overlapWarning: boolean;
} {
  const snapshotRef = useRef({
    runtimeId: null as string | null,
    isMultiRuntime: false,
    overlapWarning: false,
  });
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const runtime = enabled ? panel.runtime : null;
  const active = enabled ? panel.activeInspect : false;
  const canvasRegistryVersion = enabled ? panel.canvasRegistryVersion : 0;
  useEffect(() => {
    if (!enabled) {
      panel.setInspectHoverWidget(null);
      return;
    }
    if (!active) {
      panel.setInspectHoverWidget(null);
    }
  }, [active, enabled, panel]);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    return Runtime.subscribeCanvasRegistryChange(() => {
      panel.bumpCanvasRegistryVersion();
    });
  }, [enabled, panel]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const list = Runtime.listCanvas();
    if (!list || list.length === 0) {
      return;
    }
    panel.setIsMultiRuntime(list.length > 1);
    if (!runtime && list.length >= 1) {
      panel.setRuntime(list[0].runtime);
      panel.setRuntimeId(list[0].runtime.getCanvasId?.() ?? null);
    } else if (list.length === 1) {
      if (runtime !== list[0].runtime) {
        panel.setRuntime(list[0].runtime);
      }
      panel.setRuntimeId(list[0].runtime.getCanvasId?.() ?? null);
      return;
    }
  }, [runtime, active, canvasRegistryVersion, enabled, panel]);

  useEffect(() => {
    if (!enabled) {
      panel.setInspectHoverWidget(null);
      return;
    }
    if (!runtime) {
      return;
    }
    const renderer = runtime.getRenderer();
    const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas =
      raw?.canvas ?? runtime.container?.querySelector(DEVTOOLS_DOM_TAGS.CANVAS) ?? null;

    let lastEvent: MouseEvent | null = null;
    let raf = 0;
    let lastHover: Widget | null = null;

    function schedule(): void {
      if (raf) {
        return;
      }
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!lastEvent || !active) {
          return;
        }
        // 合并多次鼠标事件，减少命中测试的频次
        const cx = lastEvent.clientX;
        const cy = lastEvent.clientY;
        try {
          const list = Runtime.listCanvas();
          const nextMulti = list.length > 1;
          if (nextMulti !== panel.isMultiRuntime) {
            panel.setIsMultiRuntime(nextMulti);
          }
          let overCanvas = false;
          for (const it of list) {
            const r = it.canvas.getBoundingClientRect();
            const inside = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
            if (inside) {
              const elAt = document.elementFromPoint(cx, cy);
              if (elAt === it.canvas) {
                overCanvas = true;
                if (it.runtime !== runtime) {
                  panel.setRuntime(it.runtime);
                }
                panel.setRuntimeId(it.runtime.getCanvasId?.() ?? null);
                break;
              }
            }
          }
          if (!overCanvas) {
            lastHover = null;
            panel.setInspectHoverWidget(null);
            return;
          }
        } catch {
          lastHover = null;
          panel.setInspectHoverWidget(null);
          return;
        }
        const rendererNow = runtime?.getRenderer();
        const rawNow = rendererNow?.getRawInstance?.() as CanvasRenderingContext2D | null;
        const canvasEl =
          rawNow?.canvas ?? runtime?.container?.querySelector(DEVTOOLS_DOM_TAGS.CANVAS);
        if (!canvasEl) {
          lastHover = null;
          panel.setInspectHoverWidget(null);
          return;
        }
        const rect = (canvasEl as HTMLCanvasElement).getBoundingClientRect();
        const elAt = document.elementFromPoint(cx, cy);
        if (elAt !== canvasEl) {
          lastHover = null;
          panel.setInspectHoverWidget(null);
          return;
        }
        const x = cx - rect.left;
        const y = cy - rect.top;

        const root = runtime!.getRootWidget?.();
        const overlayRoot = runtime!.getOverlayRootWidget?.() ?? null;
        let finalTarget: Widget | null = null;

        if (root) {
          try {
            let rawTarget: Widget | null = null;
            if (overlayRoot) {
              rawTarget = hitTest(overlayRoot, x, y);
            }
            if (!rawTarget) {
              rawTarget = hitTest(root, x, y);
            }
            finalTarget = resolveHitWidget(root, rawTarget, overlayRoot);
          } catch (err) {
            console.error(DEVTOOLS_LOG.PREFIX, DEVTOOLS_LOG.HIT_TEST_FAIL, err);
          }
        }

        lastHover = finalTarget;
        panel.setInspectHoverWidget(finalTarget);
      });
    }

    // 双层节流：pointermove 频繁触发，命中测试控制在 60fps 以内
    const scheduleThrottled = throttle(schedule, 16, { trailing: true });

    function onMove(e: MouseEvent): void {
      if (!active) {
        return;
      }
      lastEvent = e;
      lastPos.current = { x: e.clientX, y: e.clientY };
      scheduleThrottled();
    }

    function onClick(): void {
      if (!active) {
        return;
      }
      if (active && lastHover && runtime) {
        panel.setPickedWidget(lastHover);
        lastHover = null;
        panel.setInspectHoverWidget(null);
      }
    }

    window.addEventListener(
      DEVTOOLS_DOM_EVENTS.MOUSEMOVE,
      onMove,
      DEVTOOLS_DOM_EVENT_OPTIONS.PASSIVE_TRUE,
    );
    canvas?.addEventListener(DEVTOOLS_DOM_EVENTS.CLICK, onClick);

    return () => {
      window.removeEventListener(DEVTOOLS_DOM_EVENTS.MOUSEMOVE, onMove);
      canvas?.removeEventListener(DEVTOOLS_DOM_EVENTS.CLICK, onClick);
      if (raf) {
        cancelAnimationFrame(raf);
      }
      scheduleThrottled.cancel();
    };
  }, [runtime, active, enabled, panel]);

  if (enabled) {
    snapshotRef.current = {
      runtimeId: panel.runtimeId,
      isMultiRuntime: panel.isMultiRuntime,
      overlapWarning: panel.overlapWarning,
    };
  }
  return snapshotRef.current;
}
