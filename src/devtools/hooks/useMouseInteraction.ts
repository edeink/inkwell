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
  listCanvas?: () => Array<{ canvas: HTMLCanvasElement; runtime: Runtime }>;
}

export function useMouseInteraction({
  runtime,
  overlay,
  active,
  getHoverRef,
  setHoverRef,
  setRuntime,
  onPick,
  listCanvas,
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
      const listFn = listCanvas ?? Runtime.listCanvas;
      const list = listFn();
      return !!list && list.length > 1;
    } catch {
      return false;
    }
  });
  const [overlapWarning, setOverlapWarning] = useState<boolean>(false);
  const ioRef = useRef<IntersectionObserver | null>(null);
  // 初始与持续匹配：
  // 1) 当 runtime 为空时进行初始化匹配
  // 2) 当 Inspect 激活时持续比较，并在更匹配的 runtime 出现时更新
  useEffect(() => {
    const listFn = listCanvas ?? Runtime.listCanvas;
    const list = listFn();
    if (!list || list.length === 0) {
      return;
    }
    setIsMultiRuntime(list.length > 1);
    // 若仅单个画布，直接绑定（初始化或持续时均适用）
    if (list.length === 1) {
      if (runtime !== list[0].runtime) {
        setRuntime(list[0].runtime);
      }
      setRuntimeId(list[0].runtime.getCanvasId?.() ?? null);
      return;
    }
    // 选择比较坐标：优先使用指针坐标，其次视口中心
    const cx = Math.max(
      0,
      Math.min(window.innerWidth - 1, Math.floor(lastPos.current?.x ?? window.innerWidth / 2)),
    );
    const cy = Math.max(
      0,
      Math.min(window.innerHeight - 1, Math.floor(lastPos.current?.y ?? window.innerHeight / 2)),
    );
    const elAt = document.elementFromPoint(cx, cy);
    // 当 Inspect 激活时持续比较；或 runtime 尚未设置时初始化比较
    if (active || !runtime) {
      for (const it of list) {
        const r = it.canvas.getBoundingClientRect();
        const inside = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
        if (inside && elAt === it.canvas) {
          if (runtime !== it.runtime) {
            setRuntime(it.runtime);
          }
          setRuntimeId(it.runtime.getCanvasId?.() ?? null);
          return;
        }
      }
    }
  }, [runtime, active, listCanvas]);

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
    const canvas = raw?.canvas ?? runtime.getContainer()?.querySelector('canvas');

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
          const listFn = listCanvas ?? Runtime.listCanvas;
          const list = listFn();
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
        const canvasEl = canvas as HTMLCanvasElement;
        const rect = canvasEl.getBoundingClientRect();
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
  }, [runtime, overlay, active]);

  // 运行时切换后进行重叠检测（仅在 Inspect 模式下进行）
  useEffect(() => {
    const listFn = listCanvas ?? Runtime.listCanvas;
    const list = listFn();
    if (!runtime || !active || !list || list.length <= 1) {
      setOverlapWarning(false);
      return;
    }
    const current = list.find((it) => it.runtime === runtime) ?? null;
    if (!current) {
      setOverlapWarning(false);
      return;
    }
    const curRect = current.canvas.getBoundingClientRect();
    const curZ = Number(getComputedStyle(current.canvas).zIndex || 0);
    let overlapped = false;
    for (const it of list) {
      if (it === current) {
        continue;
      }
      const r = it.canvas.getBoundingClientRect();
      const w = Math.max(0, Math.min(curRect.right, r.right) - Math.max(curRect.left, r.left));
      const h = Math.max(0, Math.min(curRect.bottom, r.bottom) - Math.max(curRect.top, r.top));
      const otherZ = Number(getComputedStyle(it.canvas).zIndex || 0);
      if (w > 0 && h > 0 && otherZ >= curZ) {
        overlapped = true;
        break;
      }
    }
    setOverlapWarning(overlapped);
    // 使用 IntersectionObserver 跟踪视口变化，触发重算
    try {
      ioRef.current?.disconnect?.();
      ioRef.current = new IntersectionObserver(() => {
        const listNow = listFn();
        const c = listNow.find((it) => it.runtime === runtime);
        if (!c) {
          return;
        }
        const cr = c.canvas.getBoundingClientRect();
        const cz = Number(getComputedStyle(c.canvas).zIndex || 0);
        let ov = false;
        for (const it of listNow) {
          if (it.runtime === runtime) {
            continue;
          }
          const r = it.canvas.getBoundingClientRect();
          const w = Math.max(0, Math.min(cr.right, r.right) - Math.max(cr.left, r.left));
          const h = Math.max(0, Math.min(cr.bottom, r.bottom) - Math.max(cr.top, r.top));
          const oz = Number(getComputedStyle(it.canvas).zIndex || 0);
          if (w > 0 && h > 0 && oz >= cz) {
            ov = true;
            break;
          }
        }
        setOverlapWarning(ov);
      });
      for (const it of list) {
        ioRef.current.observe(it.canvas);
      }
    } catch {
      /* noop */
    }
    return () => {
      try {
        ioRef.current?.disconnect?.();
      } catch {
        /* noop */
      }
    };
  }, [runtime, active, listCanvas]);

  return { runtimeId, isMultiRuntime, overlapWarning };
}
