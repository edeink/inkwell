import { useEffect, useRef, useState } from 'react';

import Runtime from '../../runtime';
import Overlay, { hitTest } from '../components/overlay';

import type { Widget } from '@/core/base';

export interface MouseInteractionOptions {
  runtime: Runtime | null;
  overlay: Overlay | null;
  active: boolean;
  getHoverRef: () => Widget | null;
  setHoverRef: (w: Widget | null) => void;
  setRuntime: (rt: Runtime) => void;
  onPick: (w: Widget) => void;
}

export function useMouseInteraction({
  runtime,
  overlay,
  active,
  getHoverRef,
  setHoverRef,
  setRuntime,
  onPick,
}: MouseInteractionOptions): {
  runtimeId: string | null;
  isMultiRuntime: boolean;
  overlapWarning: boolean;
} {
  // 最近一次指针位置，用于在 Inspect 激活时进行更匹配的 runtime 比较
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [runtimeId, setRuntimeId] = useState<string | null>(null);
  const [isMultiRuntime, setIsMultiRuntime] = useState<boolean>(() => {
    try {
      const list = Runtime.listCanvas();
      return !!list && list.length > 1;
    } catch {
      return false;
    }
  });
  // overlapWarning 功能已移除，保持接口不变，始终返回 false
  const overlapWarning = false;
  // 初始与持续匹配：
  // 1) 当 runtime 为空时进行初始化匹配
  // 2) 当 Inspect 激活时持续比较，并在更匹配的 runtime 出现时更新
  useEffect(() => {
    const list = Runtime.listCanvas();
    if (!list || list.length === 0) {
      return;
    }
    setIsMultiRuntime(list.length > 1);
    // 当没有指定 runtime 时，默认使用第一个可用的 runtime
    if (!runtime && list.length >= 1) {
      setRuntime(list[0].runtime);
      setRuntimeId(list[0].runtime.getCanvasId?.() ?? null);
      // 初始化后仍允许 Inspect 逻辑继续比较更匹配的 runtime
    } else if (list.length === 1) {
      // 单画布场景下保持绑定
      if (runtime !== list[0].runtime) {
        setRuntime(list[0].runtime);
      }
      setRuntimeId(list[0].runtime.getCanvasId?.() ?? null);
      return;
    }
  }, [runtime, active, setRuntime]);

  // 处理 overlay 激活状态和位置信息
  useEffect(() => {
    if (!runtime || !overlay) {
      return;
    }
    const ov = overlay!;
    ov.mount();
    ov.setActive(active);
    const renderer = runtime.getRenderer();
    const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? runtime.container?.querySelector('canvas') ?? null;

    let lastEvent: MouseEvent | null = null;
    let raf = 0;

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
          // 动态更新多 runtime 状态，适配画布增减
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
            ov.highlight(null);
            return;
          }
        } catch {}
        const rendererNow = runtime?.getRenderer();
        const rawNow = rendererNow?.getRawInstance?.() as CanvasRenderingContext2D | null;
        const canvasEl = rawNow?.canvas ?? runtime?.container?.querySelector('canvas');
        if (!canvasEl) {
          ov.highlight(null);
          return;
        }
        const rect = (canvasEl as HTMLCanvasElement).getBoundingClientRect();
        const elAt = document.elementFromPoint(cx, cy);
        if (elAt !== canvasEl) {
          ov.highlight(null);
          return;
        }
        const x = cx - rect.left;
        const y = cy - rect.top;
        const target = hitTest(runtime!.getRootWidget?.(), x, y);
        setHoverRef(target);
        ov.highlight(target);
      });
    }

    function onMove(e: MouseEvent): void {
      lastEvent = e;
      lastPos.current = { x: e.clientX, y: e.clientY };
      schedule();
    }

    function onClick(): void {
      const current = getHoverRef();
      if (active && current && runtime) {
        onPick(current);
        ov.setActive(false);
        ov.highlight(null);
      }
    }

    ov.startAutoUpdate(() => getHoverRef());
    window.addEventListener('mousemove', onMove, { passive: true });
    canvas?.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      canvas?.removeEventListener('click', onClick);
      ov.stopAutoUpdate();
      ov.unmount();
      if (raf) {
        cancelAnimationFrame(raf);
      }
    };
  }, [runtime, overlay, active, getHoverRef, onPick, setHoverRef, setRuntime, isMultiRuntime]);

  return { runtimeId, isMultiRuntime, overlapWarning };
}
