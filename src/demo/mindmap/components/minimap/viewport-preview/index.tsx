import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CustomComponentType } from '../../../custom-widget/type';
import {
  connectorPathFromRects,
  ConnectorStyle,
  DEFAULT_CONNECTOR_OPTIONS,
  type Point,
} from '../../../helpers/connection-drawer';
import { fitBounds, type Rect } from '../utils';

import styles from './index.module.less';

import type { Widget } from '@/core/base';

import { useThemePalette } from '@/demo/mindmap/config/theme';
import { MindmapController } from '@/demo/mindmap/controller/index';

const MINIMAP_PADDING = 15;

/**
 * ViewportPreview
 * 渲染主视图的缩略预览（节点与连线），并计算缩略图坐标映射
 */
export type ViewportPreviewProps = {
  controller: MindmapController;
  width: number;
  height: number;
  background?: string;
  onFitChange?: (fit: { s: number; ox: number; oy: number }) => void;
};

/**
 * ViewportPreview
 * @param {ViewportPreviewProps} props 组件参数
 * @returns {JSX.Element} 画布预览
 */
export default function ViewportPreview({
  controller,
  width,
  height,
  background,
  onFitChange,
}: ViewportPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [_fit, setFit] = useState<{ s: number; ox: number; oy: number }>({ s: 1, ox: 0, oy: 0 });
  const rafIdRef = useRef<number | null>(null);
  const lastDrawKeyRef = useRef<string>('');
  const palette = useThemePalette();
  const runtime = controller.runtime;
  const viewport = controller.viewport;

  const getRoot = useCallback((): Widget | null => runtime.getRootWidget(), [runtime]);

  const collectNodeRects = useCallback(
    (root: Widget | null): Rect[] => {
      if (!root) {
        return [];
      }
      const vpPos = viewport.getAbsolutePosition();
      const out: Rect[] = [];
      const walk = (w: Widget) => {
        if (w.type === CustomComponentType.MindMapNode) {
          const p = w.getAbsolutePosition();
          const s = w.renderObject.size;
          // 将屏幕坐标转换为世界坐标
          const worldX = (p.dx - vpPos.dx - viewport.tx) / viewport.scale - controller.contentTx;
          const worldY = (p.dy - vpPos.dy - viewport.ty) / viewport.scale - controller.contentTy;

          out.push({
            x: worldX,
            y: worldY,
            width: s.width,
            height: s.height,
          });
        }
        for (const c of w.children) {
          walk(c);
        }
      };
      walk(root);
      return out;
    },
    [viewport, controller],
  );

  const collectConnectorPaths = useCallback(
    (root: Widget | null): Point[][] => {
      if (!root) {
        return [];
      }
      const vpPos = viewport.getAbsolutePosition();
      const rectByKey = new Map<string, Rect>();
      const buildRectMap = (w: Widget) => {
        if (w.type === CustomComponentType.MindMapNode) {
          const p = w.getAbsolutePosition();
          const s = w.renderObject.size;
          // 将屏幕坐标转换为世界坐标
          rectByKey.set(w.key, {
            x: (p.dx - vpPos.dx - viewport.tx) / viewport.scale - controller.contentTx,
            y: (p.dy - vpPos.dy - viewport.ty) / viewport.scale - controller.contentTy,
            width: s.width,
            height: s.height,
          });
        }
        for (const c of w.children) {
          buildRectMap(c);
        }
      };
      const paths: Point[][] = [];
      const walk = (w: Widget) => {
        if (w.type === CustomComponentType.Connector) {
          type ConnectorDataLike = { fromKey: string; toKey: string; style?: ConnectorStyle };
          const { fromKey, toKey, style } = w as unknown as ConnectorDataLike;
          const a = rectByKey.get(fromKey);
          const b = rectByKey.get(toKey);
          if (a && b) {
            const aCenterX = a.x + a.width / 2;
            const bCenterX = b.x + b.width / 2;
            const leftRect = aCenterX <= bCenterX ? a : b;
            const rightRect = leftRect === a ? b : a;
            const pts = connectorPathFromRects({
              left: leftRect,
              right: rightRect,
              style: style ?? ConnectorStyle.Bezier,
              samples: DEFAULT_CONNECTOR_OPTIONS.samples,
              margin: DEFAULT_CONNECTOR_OPTIONS.margin,
              elbowRadius: DEFAULT_CONNECTOR_OPTIONS.elbowRadius,
              arcSegments: DEFAULT_CONNECTOR_OPTIONS.arcSegments,
            });
            paths.push(pts);
          }
        }
        for (const c of w.children) {
          walk(c);
        }
      };
      const r = root;
      if (r) {
        buildRectMap(r);
        walk(r);
      }
      return paths;
    },
    [viewport, controller],
  );

  const computeContentBounds = useCallback(
    (root: Widget | null): Rect => {
      const nodes = collectNodeRects(root);
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const r of nodes) {
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.width);
        maxY = Math.max(maxY, r.y + r.height);
      }
      if (!Number.isFinite(minX)) {
        const sz = viewport.renderObject.size;
        return { x: 0, y: 0, width: sz.width, height: sz.height };
      }
      return {
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX),
        height: Math.max(0, maxY - minY),
      };
    },
    [viewport, collectNodeRects],
  );

  /**
   * 清空并绘制背景
   * @param {CanvasRenderingContext2D} ctx 2D 上下文
   */
  const clear = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to clear full buffer
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = background ?? palette.minimapBackgroundColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    },
    [background, palette.minimapBackgroundColor],
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

    // Handle High DPI
    const dpr = window.devicePixelRatio || 1;
    // We only update width/height if they mismatch to avoid clearing unnecessarily,
    // but clear() is called anyway.
    // Actually, setting width/height clears canvas, so we should check.
    const logicalW = width;
    const logicalH = height;
    const pixelW = Math.round(logicalW * dpr);
    const pixelH = Math.round(logicalH * dpr);

    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }

    const root = getRoot();
    const bounds = computeContentBounds(root);
    // Add padding (15px) for preview mode safety margin
    const nextFit = fitBounds(bounds, logicalW, logicalH, 15);
    const prevKey = lastDrawKeyRef.current;
    const curKey = `${nextFit.s.toFixed(3)}:${nextFit.ox.toFixed(1)}:${nextFit.oy.toFixed(1)}`;
    if (prevKey !== curKey) {
      setFit(nextFit);
      onFitChange?.(nextFit);
      lastDrawKeyRef.current = curKey;
    }
    clear(ctx);
    const nodes = collectNodeRects(root);
    ctx.save();

    // Scale for DPR then apply minimap fit
    ctx.scale(dpr, dpr);
    ctx.translate(nextFit.ox, nextFit.oy);
    ctx.scale(nextFit.s, nextFit.s);

    for (const r of nodes) {
      ctx.fillStyle = palette.nodeFillColor;
      ctx.strokeStyle = palette.primaryColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.width, r.height);
      ctx.fill();
      ctx.stroke();
    }
    const paths = collectConnectorPaths(root);
    ctx.strokeStyle = palette.connectorColor;
    ctx.lineWidth = 1;
    for (const pts of paths) {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }, [
    width,
    height,
    onFitChange,
    clear,
    computeContentBounds,
    getRoot,
    palette.primaryColor,
    palette.nodeFillColor,
    palette.connectorColor,
    collectNodeRects,
    collectConnectorPaths,
  ]);

  const scheduleDraw = useCallback(() => {
    if (rafIdRef.current) {
      return;
    }
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      draw();
    });
  }, [draw]);

  useEffect(() => {
    // Canvas sizing handled in draw()
    scheduleDraw();
    const host =
      runtime.container || document.getElementById(runtime.getCanvasId() || '') || undefined;

    // Listen to layout changes (add/move nodes)
    const offLayout = controller.addLayoutChangeListener(() => scheduleDraw());

    const ro = new ResizeObserver(() => scheduleDraw());
    if (host) {
      ro.observe(host);
    }
    return () => {
      offLayout?.();
      ro.disconnect();
      const id = rafIdRef.current;
      if (id) {
        cancelAnimationFrame(id);
      }
      rafIdRef.current = null;
    };
  }, [runtime, controller, width, height, scheduleDraw]);

  const styleMemo = useMemo(
    () => ({ width: `${width}px`, height: `${height}px` }),
    [width, height],
  );

  return <canvas ref={canvasRef} className={styles.canvas} style={styleMemo} />;
}
