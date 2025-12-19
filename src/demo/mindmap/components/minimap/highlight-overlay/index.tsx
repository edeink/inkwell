import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { computeViewportRect, type Fit } from '../utils';

import styles from './index.module.less';

import { useThemePalette } from '@/demo/mindmap/config/theme';
import { MindmapController } from '@/demo/mindmap/controller/index';

export type HighlightOverlayProps = {
  controller: MindmapController;
  fit: Fit;
  width: number;
  height: number;
  stroke?: string;
  fill?: string;
  borderWidth?: number;
};

/**
 * HighlightOverlay
 * @param {HighlightOverlayProps} props 组件参数
 * @returns {JSX.Element} 高亮覆盖层
 */
export default function HighlightOverlay({
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
  const dragModeRef = useRef<'none' | 'rect' | 'jump'>('none');
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const palette = useThemePalette();
  const runtime = controller.runtime;

  // 使用 ref 存储当前视图状态以避免重渲染
  const viewStateRef = useRef({
    scale: controller.viewScale,
    tx: controller.viewTx,
    ty: controller.viewTy,
    contentTx: controller.contentTx,
    contentTy: controller.contentTy,
  });

  const clear = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置变换以清除完整缓冲区
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // 处理高 DPI
    const dpr = window.devicePixelRatio || 1;
    const logicalW = width;
    const logicalH = height;
    const pixelW = Math.round(logicalW * dpr);
    const pixelH = Math.round(logicalH * dpr);

    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }

    const container = runtime.getContainer();
    const cW = container?.clientWidth || 1;
    const cH = container?.clientHeight || 1;
    const vs = viewStateRef.current;

    const rect = computeViewportRect(
      cW,
      cH,
      vs.scale,
      vs.tx,
      vs.ty,
      vs.contentTx,
      vs.contentTy,
      fit,
    );
    const key = [
      rect.x.toFixed(1),
      rect.y.toFixed(1),
      rect.width.toFixed(1),
      rect.height.toFixed(1),
      pixelW, // 将像素尺寸包含在 key 中以在调整大小时触发重绘
      pixelH,
    ].join(':');

    // 如果正在调整大小或强制重绘，则始终绘制
    // 但如果有匹配的 key，我们有跳过逻辑。
    // 然而，如果 key 匹配，我们是否也需要清除？不，如果没有变化，画布是好的。
    // 等等，如果我们在调用 draw 之前清除了... 不，draw() 通过 clear() 处理清除。
    // 但是等等，原始代码在 draw() 内部调用了 clear()。

    if (lastRectKeyRef.current === key) {
      // 如果没有变化，则什么都不做。
      return;
    }
    lastRectKeyRef.current = key;
    clear(ctx);
    ctx.save();
    ctx.scale(dpr, dpr);
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
    // 从依赖中移除 controller，因为我们使用 viewStateRef
    stroke,
    fill,
    borderWidth,
    fit,
    palette.highlightColor,
    palette.highlightFillColor,
    clear,
    width,
    height,
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

  // 从控制器同步视图状态而不重新渲染组件
  useEffect(() => {
    // 初始绘制
    viewStateRef.current = {
      scale: controller.viewScale,
      tx: controller.viewTx,
      ty: controller.viewTy,
      contentTx: controller.contentTx,
      contentTy: controller.contentTy,
    };
    scheduleDraw();

    const unsub = controller.addViewChangeListener((scale, tx, ty) => {
      viewStateRef.current = {
        scale,
        tx,
        ty,
        contentTx: controller.contentTx,
        contentTy: controller.contentTy,
      };
      scheduleDraw();
    });
    return unsub;
  }, [controller, scheduleDraw]);

  const jumpToPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      // 将点击点转换为图表坐标
      const wx = (localX - fit.ox) / fit.s;
      const wy = (localY - fit.oy) / fit.s;

      const container = runtime.getContainer();
      const W = container?.clientWidth || 1;
      const H = container?.clientHeight || 1;
      const s = controller.viewScale;

      // 计算新的视图中心
      // 如果我们希望点 (wx, wy) 位于视口中心：
      // 图表坐标中的视口中心是 (wx, wy)。
      // 屏幕中心是 (W/2, H/2)。
      // 视图变换：screenX = graphX * s + tx
      // 但现在我们有 contentTx：screenX = (graphX + contentTx) * s + tx
      // W/2 = (wx + contentTx) * s + tx  =>  tx = W/2 - (wx + contentTx) * s

      const vs = viewStateRef.current;
      const tx = W / 2 - (wx + vs.contentTx) * s;
      const ty = H / 2 - (wy + vs.contentTy) * s;

      // 注意：Math.round 是可选的，但有利于像素对齐
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
    scheduleDraw();
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [scheduleDraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const onDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      const vs = viewStateRef.current;
      const container = runtime.getContainer();
      const cW = container?.clientWidth || 1;
      const cH = container?.clientHeight || 1;

      const vpRect = computeViewportRect(
        cW,
        cH,
        vs.scale,
        vs.tx,
        vs.ty,
        vs.contentTx,
        vs.contentTy,
        fit,
      );

      if (
        localX >= vpRect.x &&
        localX <= vpRect.x + vpRect.width &&
        localY >= vpRect.y &&
        localY <= vpRect.y + vpRect.height
      ) {
        // 如果点击在高亮区域内，进入拖拽模式
        dragModeRef.current = 'rect';
        dragOffsetRef.current = { x: localX - vpRect.x, y: localY - vpRect.y };
      } else {
        // 否则，跳转到点击位置
        dragModeRef.current = 'jump';
        scheduleJump(e.clientX, e.clientY);
      }

      setDragging(true);
      canvas.setPointerCapture?.(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) {
        return;
      }

      if (dragModeRef.current === 'jump') {
        scheduleJump(e.clientX, e.clientY);
      } else if (dragModeRef.current === 'rect') {
        const rect = canvas.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;

        // 计算新的高亮区域位置
        const newRectX = localX - dragOffsetRef.current.x;
        const newRectY = localY - dragOffsetRef.current.y;

        const vs = viewStateRef.current;
        const s = vs.scale;

        // 反向计算视图平移量
        // newTx = -scale * [ (newRectX - fit.ox) / fit.s + contentTx ]
        const newTx = -s * ((newRectX - fit.ox) / fit.s + vs.contentTx);
        const newTy = -s * ((newRectY - fit.oy) / fit.s + vs.contentTy);

        controller.setViewPosition(newTx, newTy);
        scheduleDraw();
      }
    };

    const onUp = (e: PointerEvent) => {
      setDragging(false);
      dragModeRef.current = 'none';
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
  }, [dragging, fit, scheduleJump, controller, runtime, scheduleDraw]);

  const styleMemo = useMemo(
    () => ({ width: `${width}px`, height: `${height}px` }),
    [width, height],
  );

  return <canvas ref={canvasRef} className={styles.canvas} style={styleMemo} />;
}
