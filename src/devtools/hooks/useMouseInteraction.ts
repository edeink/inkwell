/**
 * Devtools 鼠标交互 Hook
 *
 * 处理鼠标移动、拾取、悬停同步与多运行时提示。
 * 注意事项：依赖 Runtime、Overlay 与 DOM 环境。
 * 潜在副作用：注册全局事件监听、读取 DOM、触发日志采样。
 */
import { throttle } from 'lodash-es';
import { useEffect, useRef } from 'react';

import Runtime from '../../runtime';
import { hitTest } from '../components/overlay';
import {
  DEVTOOLS_DEBUG_LEVEL,
  DEVTOOLS_DOM_EVENT_OPTIONS,
  DEVTOOLS_DOM_EVENTS,
  DEVTOOLS_DOM_TAGS,
  DEVTOOLS_LOG,
  devtoolsCount,
  devtoolsGetMemorySnapshot,
  devtoolsGetResourceSnapshot,
  devtoolsLog,
  devtoolsLogEffect,
  devtoolsLogState,
  devtoolsTimeEnd,
  devtoolsTimeStart,
  devtoolsTrackEventListener,
  devtoolsTrackRaf,
} from '../constants';
import { resolveHitWidget } from '../helper/resolve';

import type { DevtoolsPanelStore } from '../store/panel-store';
import type { Widget } from '@/core/base';

import { featureToggleStore } from '@/devtools/perf-panel/features-toggle';

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
      return;
    }
    devtoolsLogEffect('mouse.mount', 'start');
    devtoolsLog(DEVTOOLS_DEBUG_LEVEL.INFO, 'useMouseInteraction 挂载', {
      内存: devtoolsGetMemorySnapshot(),
      资源: devtoolsGetResourceSnapshot(),
    });
    return () => {
      devtoolsLogEffect('mouse.mount', 'cleanup');
      devtoolsLog(DEVTOOLS_DEBUG_LEVEL.INFO, 'useMouseInteraction 卸载', {
        内存: devtoolsGetMemorySnapshot(),
        资源: devtoolsGetResourceSnapshot(),
      });
    };
  }, [enabled]);
  useEffect(() => {
    if (!enabled) {
      panel.setInspectHoverWidget(null);
      return;
    }
    devtoolsLogEffect('mouse.active', 'start', { 启用: active });
    if (!active) {
      panel.setInspectHoverWidget(null);
    }
  }, [active, enabled, panel]);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    devtoolsLogEffect('mouse.canvasRegistry', 'start');
    return Runtime.subscribeCanvasRegistryChange(() => {
      panel.bumpCanvasRegistryVersion();
    });
  }, [enabled, panel]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    devtoolsCount('useMouseInteraction.canvasRegistryUpdate', { threshold: 8, windowMs: 1000 });
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
    if (!featureToggleStore.isEnabled('FEATURE_DEVTOOLS_MOUSE_LISTENER', true)) {
      panel.setInspectHoverWidget(null);
      return;
    }
    if (!runtime) {
      return;
    }
    devtoolsLogEffect('mouse.events', 'start', {
      运行时: runtime.getCanvasId?.() ?? 'unknown',
    });
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
      devtoolsTrackRaf('request');
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!lastEvent || !active) {
          return;
        }
        if (!featureToggleStore.isEnabled('FEATURE_DEVTOOLS_MOUSE_HIT_TEST', true)) {
          lastHover = null;
          panel.setInspectHoverWidget(null);
          return;
        }
        const perfStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
        devtoolsTimeStart('useMouseInteraction.hitTest', {
          运行时: runtime?.getCanvasId?.() ?? 'unknown',
        });
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
            devtoolsTimeEnd('useMouseInteraction.hitTest', { 结果: '不在画布' });
            return;
          }
        } catch {
          lastHover = null;
          panel.setInspectHoverWidget(null);
          devtoolsTimeEnd('useMouseInteraction.hitTest', { 结果: '异常' });
          return;
        }
        const rendererNow = runtime?.getRenderer();
        const rawNow = rendererNow?.getRawInstance?.() as CanvasRenderingContext2D | null;
        const canvasEl =
          rawNow?.canvas ?? runtime?.container?.querySelector(DEVTOOLS_DOM_TAGS.CANVAS);
        if (!canvasEl) {
          lastHover = null;
          panel.setInspectHoverWidget(null);
          devtoolsTimeEnd('useMouseInteraction.hitTest', { 结果: '无画布' });
          return;
        }
        const rect = (canvasEl as HTMLCanvasElement).getBoundingClientRect();
        const elAt = document.elementFromPoint(cx, cy);
        if (elAt !== canvasEl) {
          lastHover = null;
          panel.setInspectHoverWidget(null);
          devtoolsTimeEnd('useMouseInteraction.hitTest', { 结果: '元素不匹配' });
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

        devtoolsLogState('mouse.hoverWidget', lastHover, finalTarget);
        lastHover = finalTarget;
        panel.setInspectHoverWidget(finalTarget);
        devtoolsTimeEnd('useMouseInteraction.hitTest', { 结果: '完成' });
        const perfEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const cost = perfEnd - perfStart;
        if (cost >= 12) {
          devtoolsLog(DEVTOOLS_DEBUG_LEVEL.WARN, '命中测试较慢', {
            耗时: Number(cost.toFixed(2)),
            运行时: runtime?.getCanvasId?.() ?? 'unknown',
            目标: finalTarget?.type ?? null,
          });
        }
      });
    }

    const scheduleThrottled = throttle(schedule, 16, { trailing: true });

    function onMove(e: MouseEvent): void {
      if (!active) {
        return;
      }
      devtoolsCount('useMouseInteraction.onMove', { threshold: 60, windowMs: 1000 });
      lastEvent = e;
      lastPos.current = { x: e.clientX, y: e.clientY };
      scheduleThrottled();
    }

    function onClick(): void {
      if (!active) {
        return;
      }
      devtoolsCount('useMouseInteraction.onClick', { threshold: 6, windowMs: 1000 });
      if (active && lastHover && runtime) {
        devtoolsLogState('mouse.pickedWidget', null, lastHover);
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
    devtoolsTrackEventListener('add', DEVTOOLS_DOM_EVENTS.MOUSEMOVE, 'window');
    canvas?.addEventListener(DEVTOOLS_DOM_EVENTS.CLICK, onClick);
    devtoolsTrackEventListener('add', DEVTOOLS_DOM_EVENTS.CLICK, 'canvas');

    return () => {
      devtoolsLogEffect('mouse.events', 'cleanup', {
        运行时: runtime.getCanvasId?.() ?? 'unknown',
      });
      window.removeEventListener(DEVTOOLS_DOM_EVENTS.MOUSEMOVE, onMove);
      devtoolsTrackEventListener('remove', DEVTOOLS_DOM_EVENTS.MOUSEMOVE, 'window');
      canvas?.removeEventListener(DEVTOOLS_DOM_EVENTS.CLICK, onClick);
      devtoolsTrackEventListener('remove', DEVTOOLS_DOM_EVENTS.CLICK, 'canvas');
      if (raf) {
        devtoolsTrackRaf('cancel');
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
