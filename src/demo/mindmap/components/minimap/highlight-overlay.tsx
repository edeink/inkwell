import { useEffect, useRef, useState } from 'react';

import type { MindmapController } from '../../controller';

export interface HighlightOverlayProps {
  controller: MindmapController;
  fit: { s: number; ox: number; oy: number };
  width: number;
  height: number;
}

export default function HighlightOverlay({
  controller,
  fit,
  width,
  height,
}: HighlightOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null);

  // 监听视图变化以重绘高亮框
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      const vp = controller.viewport;
      const { width: vpW, height: vpH } = vp.renderObject?.size || { width: 0, height: 0 };

      // 计算可视区域在世界坐标系中的范围
      // Screen = (World - scroll) * scale + tx
      // World = (Screen - tx) / scale + scroll

      const worldLeft = (0 - vp.tx) / vp.scale + vp.scrollX;
      const worldTop = (0 - vp.ty) / vp.scale + vp.scrollY;
      const worldRight = (vpW - vp.tx) / vp.scale + vp.scrollX;
      const worldBottom = (vpH - vp.ty) / vp.scale + vp.scrollY;

      const worldW = worldRight - worldLeft;
      const worldH = worldBottom - worldTop;

      // 转换为 Minimap 坐标
      const mx = worldLeft * fit.s + fit.ox;
      const my = worldTop * fit.s + fit.oy;
      const mw = worldW * fit.s;
      const mh = worldH * fit.s;

      ctx.clearRect(0, 0, width, height);

      // 绘制半透明遮罩 (可选，突出显示可见区域)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      ctx.clearRect(mx, my, mw, mh);

      // 绘制高亮框
      ctx.strokeStyle = '#1677ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx, my, mw, mh);

      // 填充高亮框内部 (淡淡的)
      ctx.fillStyle = 'rgba(22, 119, 255, 0.05)';
      ctx.fillRect(mx, my, mw, mh);
    };

    render();

    // 订阅视图变化
    const unsubscribeView = controller.viewport.addViewChangeListener(render);
    const unsubscribeScroll = controller.viewport.addScrollListener(render);

    // 监听窗口大小变化 (如果 Viewport 大小改变)
    // 这里简单起见，利用 requestAnimationFrame 轮询或者依赖外部重渲染
    // 由于 fit 变化会触发组件重渲染，所以这里只需要监听 Viewport 内部变化

    return () => {
      unsubscribeView();
      unsubscribeScroll();
    };
  }, [controller, fit, width, height]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const vp = controller.viewport;
    const { width: vpW, height: vpH } = vp.renderObject?.size || { width: 0, height: 0 };

    // 当前高亮框位置
    const worldLeft = (0 - vp.tx) / vp.scale + vp.scrollX;
    const worldTop = (0 - vp.ty) / vp.scale + vp.scrollY;
    const mx = worldLeft * fit.s + fit.ox;
    const my = worldTop * fit.s + fit.oy;
    const mw = (vpW / vp.scale) * fit.s;
    const mh = (vpH / vp.scale) * fit.s;

    // 检查是否点击在框内
    if (x >= mx && x <= mx + mw && y >= my && y <= my + mh) {
      setIsDragging(true);
      dragStartRef.current = { x, y, sx: vp.scrollX, sy: vp.scrollY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      // 点击在框外，直接跳转
      // 计算点击位置对应的世界坐标中心
      const clickWorldX = (x - fit.ox) / fit.s;
      const clickWorldY = (y - fit.oy) / fit.s;

      // 让 Viewport 中心对齐到 clickWorldX, clickWorldY
      // WorldCenter = clickWorldX
      // WorldLeft = WorldCenter - WorldW / 2
      // scrollX = WorldLeft + tx / scale

      const worldW = vpW / vp.scale;
      const worldH = vpH / vp.scale;

      const targetWorldLeft = clickWorldX - worldW / 2;
      const targetWorldTop = clickWorldY - worldH / 2;

      const targetScrollX = targetWorldLeft + vp.tx / vp.scale;
      const targetScrollY = targetWorldTop + vp.ty / vp.scale;

      controller.viewport.scrollTo(targetScrollX, targetScrollY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - dragStartRef.current.x;
    const dy = y - dragStartRef.current.y;

    // 将屏幕像素差转换为 Minimap 坐标差，再转换为世界坐标差
    // dx_world = dx_minimap / fit.s
    const worldDx = dx / fit.s;
    const worldDy = dy / fit.s;

    const newScrollX = dragStartRef.current.sx + worldDx;
    const newScrollY = dragStartRef.current.sy + worldDy;

    controller.viewport.scrollTo(newScrollX, newScrollY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'auto',
        cursor: isDragging ? 'grabbing' : 'pointer',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
