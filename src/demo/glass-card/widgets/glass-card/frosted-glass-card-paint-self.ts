import type { BuildContext } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { roundedRectPath } from '@/demo/glass-card/helpers/canvas';
import {
  paintClearWindow,
  paintFrostedOverlay,
  paintWindowFrame,
} from '@/demo/glass-card/helpers/frosted-glass-card-paint';
import { Themes } from '@/styles/theme';

type CachedLayer = {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  key: string;
};

type PaintHost = {
  theme?: ThemePalette;
  blurPx: number;
  glassAlpha: number;
  animate: boolean;
  timeMs: number;
  baseLayer: CachedLayer | null;
  layoutCache: {
    windowX: number;
    windowY: number;
    windowW: number;
    windowH: number;
    windowR: number;
  };
  renderObject: { size: { width: number; height: number } };
  updateStaticCaches(width: number, height: number): void;
};

/**
 * @description FrostedGlassCard 的 Canvas2D 绘制入口：底图、磨砂层、清晰窗口与边框。
 * @param host FrostedGlassCard 实例（或等价宿主）
 * @param context 渲染上下文
 * @returns void
 * @example
 * ```ts
 * // 由框架渲染管线调用：外部通常不需要直接使用
 * ```
 */
export function paintFrostedGlassCard(host: PaintHost, context: BuildContext): void {
  const renderer = context.renderer;
  const ctx = renderer.getRawInstance?.() as CanvasRenderingContext2D | null;
  const theme = host.theme ?? Themes.light;
  const { width, height } = host.renderObject.size;
  if (width <= 0 || height <= 0) {
    return;
  }

  if (!ctx) {
    renderer.drawRect({
      x: 0,
      y: 0,
      width,
      height,
      fill: theme.background.container,
      stroke: theme.border.base,
      strokeWidth: 1,
      borderRadius: Math.min(24, height * 0.12),
    });
    return;
  }

  const { windowX, windowY, windowW, windowH, windowR } = host.layoutCache;

  ctx.save();
  ctx.beginPath();
  roundedRectPath(ctx, 0, 0, width, height, Math.min(24, height * 0.12));
  ctx.clip();

  if (host.baseLayer) {
    const baseImage = host.baseLayer.canvas as unknown as CanvasImageSource;
    ctx.drawImage(baseImage, 0, 0, width, height);
  } else {
    ctx.fillStyle = theme.background.container;
    ctx.fillRect(0, 0, width, height);
  }

  const baseLayerCanvas = host.baseLayer
    ? (host.baseLayer.canvas as unknown as CanvasImageSource)
    : null;
  paintFrostedOverlay(
    ctx,
    theme,
    width,
    height,
    Math.min(24, height * 0.12),
    windowX,
    windowY,
    windowW,
    windowH,
    windowR,
    baseLayerCanvas,
    host.blurPx,
    host.glassAlpha,
    host.animate,
    host.timeMs,
  );

  paintClearWindow(
    ctx,
    width,
    height,
    windowX,
    windowY,
    windowW,
    windowH,
    windowR,
    baseLayerCanvas,
  );
  paintWindowFrame(ctx, theme, windowX, windowY, windowW, windowH, windowR);
  ctx.restore();
}
