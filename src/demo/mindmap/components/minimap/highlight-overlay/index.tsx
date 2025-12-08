import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import styles from './index.module.less';

import type Runtime from '@/runtime';

import { useThemePalette } from '@/demo/mindmap/config/theme';
import { MindmapController } from '@/demo/mindmap/controller/index';

export type Fit = { s: number; ox: number; oy: number };

export type HighlightOverlayProps = {
  runtime: Runtime;
  controller: MindmapController;
  fit: Fit;
  width: number;
  height: number;
  stroke?: string;
  fill?: string;
  borderWidth?: number;
};

/**
 * 计算主视图可视区域在小地图中的矩形
 */
function computeViewportRect(
  containerW: number,
  containerH: number,
  viewScale: number,
  viewTx: number,
  viewTy: number,
  fit: Fit,
): { x: number; y: number; width: number; height: number } {
  const x0 = (0 - viewTx) / viewScale;
  const y0 = (0 - viewTy) / viewScale;
  const vw = containerW / viewScale;
  const vh = containerH / viewScale;
  const mx = fit.ox + x0 * fit.s;
  const my = fit.oy + y0 * fit.s;
  const mw = vw * fit.s;
  const mh = vh * fit.s;
  return { x: mx, y: my, width: mw, height: mh };
}

/**
 * HighlightOverlay
 * @param {HighlightOverlayProps} props 组件参数
 * @returns {JSX.Element} 高亮覆盖层
 */
export default function HighlightOverlay({
  runtime,
  controller,
  fit,
  width,
  height,
  stroke,
  fill,
  borderWidth = 2,
}: HighlightOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastRectKeyRef = useRef<string>('');
  const palette = useThemePalette();

  const clear = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, width, height);
    },
    [width, height],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const container = runtime.getContainer();
    const cW = container?.clientWidth || 1;
    const cH = container?.clientHeight || 1;
    const rect = computeViewportRect(
      cW,
      cH,
      controller.viewScale,
      controller.viewTx,
      controller.viewTy,
      fit,
    );
    const key = [
      rect.x.toFixed(1),
      rect.y.toFixed(1),
      rect.width.toFixed(1),
      rect.height.toFixed(1),
    ].join(':');
    if (lastRectKeyRef.current === key) {
      return;
    }
    lastRectKeyRef.current = key;
    clear(ctx);
    ctx.save();
    ctx.strokeStyle = stroke ?? palette.highlightColor;
    ctx.fillStyle = fill ?? palette.highlightFillColor;
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [
    runtime,
    controller,
    stroke,
    fill,
    borderWidth,
    fit,
    palette.highlightColor,
    palette.highlightFillColor,
    clear,
  ]);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current) {
      return;
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  const jumpToPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const wx = (localX - fit.ox) / fit.s;
      const wy = (localY - fit.oy) / fit.s;
      const container = runtime.getContainer();
      const W = container?.clientWidth || 1;
      const H = container?.clientHeight || 1;
      const s = controller.viewScale;
      const tx = Math.round(W / 2 - wx * s);
      const ty = Math.round(H / 2 - wy * s);
      controller.setViewPosition(tx, ty);
      scheduleDraw();
    },
    [runtime, controller, fit.s, fit.ox, fit.oy, scheduleDraw],
  );

  const pendingJumpRef = useRef<{ x: number; y: number } | null>(null);
  const scheduleJump = useCallback(
    (clientX: number, clientY: number) => {
      pendingJumpRef.current = { x: clientX, y: clientY };
      if (rafRef.current) {
        return;
      }
      rafRef.current = requestAnimationFrame(() => {
        const p = pendingJumpRef.current;
        rafRef.current = null;
        if (p) {
          jumpToPoint(p.x, p.y);
          pendingJumpRef.current = null;
        }
      });
    },
    [jumpToPoint],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
    scheduleDraw();
    const host =
      runtime.getContainer() || document.getElementById(runtime.getCanvasId() || '') || undefined;
    const off = controller.addViewChangeListener(() => scheduleDraw());
    const ro = new ResizeObserver(() => scheduleDraw());
    if (host) {
      ro.observe(host);
    }
    return () => {
      off?.();
      ro.disconnect();
      const id = rafRef.current;
      if (id) {
        cancelAnimationFrame(id);
      }
      rafRef.current = null;
    };
  }, [runtime, controller, width, height, fit.s, fit.ox, fit.oy, scheduleDraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const onDown = (e: PointerEvent) => {
      setDragging(true);
      canvas.setPointerCapture?.(e.pointerId);
      scheduleJump(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) {
        return;
      }
      scheduleJump(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      setDragging(false);
      try {
        canvas.releasePointerCapture?.(e.pointerId);
      } catch {
        void 0;
      }
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onUp);
    };
  }, [dragging, fit.s, fit.ox, fit.oy, scheduleJump]);

  const styleMemo = useMemo(
    () => ({ width: `${width}px`, height: `${height}px` }),
    [width, height],
  );

  return <canvas ref={canvasRef} className={styles.canvas} style={styleMemo} />;
}
