import { useEffect, useRef, useState } from 'react';

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

export interface MouseInteractionOptions {
  runtime: Runtime | null;
  active: boolean;
  setRuntime: (rt: Runtime) => void;
  setHoverWidget: (w: Widget | null) => void;
  setPickedWidget: (w: Widget) => void;
}

export function useMouseInteraction({
  runtime,
  active,
  setRuntime,
  setHoverWidget,
  setPickedWidget,
}: MouseInteractionOptions): {
  runtimeId: string | null;
  isMultiRuntime: boolean;
  overlapWarning: boolean;
} {
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [runtimeId, setRuntimeId] = useState<string | null>(null);
  const [canvasRegistryVersion, setCanvasRegistryVersion] = useState(0);
  const [isMultiRuntime, setIsMultiRuntime] = useState<boolean>(() => {
    try {
      const list = Runtime.listCanvas();
      return !!list && list.length > 1;
    } catch {
      return false;
    }
  });
  const overlapWarning = false;
  useEffect(() => {
    if (!active) {
      setHoverWidget(null);
    }
  }, [active, setHoverWidget]);
  useEffect(() => {
    return Runtime.subscribeCanvasRegistryChange(() => {
      setCanvasRegistryVersion((v) => v + 1);
    });
  }, []);

  useEffect(() => {
    const list = Runtime.listCanvas();
    if (!list || list.length === 0) {
      return;
    }
    setIsMultiRuntime(list.length > 1);
    if (!runtime && list.length >= 1) {
      setRuntime(list[0].runtime);
      setRuntimeId(list[0].runtime.getCanvasId?.() ?? null);
    } else if (list.length === 1) {
      if (runtime !== list[0].runtime) {
        setRuntime(list[0].runtime);
      }
      setRuntimeId(list[0].runtime.getCanvasId?.() ?? null);
      return;
    }
  }, [runtime, active, setRuntime, canvasRegistryVersion]);

  useEffect(() => {
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
        const cx = lastEvent.clientX;
        const cy = lastEvent.clientY;
        try {
          const list = Runtime.listCanvas();
          const nextMulti = list.length > 1;
          if (nextMulti !== isMultiRuntime) {
            setIsMultiRuntime(nextMulti);
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
                  setRuntime(it.runtime);
                }
                setRuntimeId(it.runtime.getCanvasId?.() ?? null);
                break;
              }
            }
          }
          if (!overCanvas) {
            lastHover = null;
            setHoverWidget(null);
            return;
          }
        } catch {
          lastHover = null;
          setHoverWidget(null);
          return;
        }
        const rendererNow = runtime?.getRenderer();
        const rawNow = rendererNow?.getRawInstance?.() as CanvasRenderingContext2D | null;
        const canvasEl =
          rawNow?.canvas ?? runtime?.container?.querySelector(DEVTOOLS_DOM_TAGS.CANVAS);
        if (!canvasEl) {
          lastHover = null;
          setHoverWidget(null);
          return;
        }
        const rect = (canvasEl as HTMLCanvasElement).getBoundingClientRect();
        const elAt = document.elementFromPoint(cx, cy);
        if (elAt !== canvasEl) {
          lastHover = null;
          setHoverWidget(null);
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
        setHoverWidget(finalTarget);
      });
    }

    function onMove(e: MouseEvent): void {
      lastEvent = e;
      lastPos.current = { x: e.clientX, y: e.clientY };
      schedule();
    }

    function onClick(): void {
      if (active && lastHover && runtime) {
        setPickedWidget(lastHover);
        lastHover = null;
        setHoverWidget(null);
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
    };
  }, [runtime, active, setHoverWidget, setPickedWidget, setRuntime, isMultiRuntime]);

  return { runtimeId, isMultiRuntime, overlapWarning };
}
