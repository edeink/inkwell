import { useEffect, useRef } from 'react';

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
}: MouseInteractionOptions): void {
  // 最近一次指针位置，用于在 Inspect 激活时进行更匹配的 runtime 比较
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  // 初始与持续匹配：
  // 1) 当 runtime 为空时进行初始化匹配
  // 2) 当 Inspect 激活时持续比较，并在更匹配的 runtime 出现时更新
  useEffect(() => {
    const listFn = listCanvas ?? Runtime.listCanvas;
    const list = listFn();
    if (!list || list.length === 0) {
      return;
    }
    // 若仅单个画布，直接绑定（初始化或持续时均适用）
    if (list.length === 1) {
      if (runtime !== list[0].runtime) {
        setRuntime(list[0].runtime);
      }
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
                  return;
                }
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
}
