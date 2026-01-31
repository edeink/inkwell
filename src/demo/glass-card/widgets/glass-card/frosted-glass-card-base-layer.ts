import type { ThemePalette } from '@/styles/theme';

import { renderBaseLayer } from '@/demo/glass-card/helpers/frosted-glass-card-paint';

type CachedLayer = {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  key: string;
};

type BaseLayerHost = {
  baseLayer: CachedLayer | null;
  backgroundImageSrc?: string;
  bgImageLoaded: boolean;
  bgImage: HTMLImageElement | null;
  bgImageNaturalW: number;
  bgImageNaturalH: number;
};

/**
 * @description 确保离屏底图层存在且 key 匹配；仅在 key 变化时重绘离屏内容。
 * @param host FrostedGlassCard 实例（或等价宿主）
 * @param key 离屏缓存 key
 * @param width 当前布局宽度
 * @param height 当前布局高度
 * @param dpr 设备像素比
 * @param theme 主题色板
 * @param radius 卡片圆角
 * @param windowX 清晰窗口 x
 * @param windowY 清晰窗口 y
 * @param windowW 清晰窗口宽
 * @param windowH 清晰窗口高
 * @param windowR 清晰窗口圆角
 * @returns void
 * @example
 * ```ts
 * // 由 FrostedGlassCard 内部调用：外部通常不需要直接使用
 * ```
 */
export function ensureBaseLayer(
  host: BaseLayerHost,
  key: string,
  width: number,
  height: number,
  dpr: number,
  theme: ThemePalette,
  radius: number,
  windowX: number,
  windowY: number,
  windowW: number,
  windowH: number,
  windowR: number,
) {
  if (!host.baseLayer) {
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(1, 1)
        : (document.createElement('canvas') as HTMLCanvasElement);
    const ctx =
      typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas
        ? canvas.getContext('2d')
        : (canvas as HTMLCanvasElement).getContext('2d');
    if (!ctx) {
      return;
    }
    host.baseLayer = { canvas, ctx, key: '' };
  }

  if (host.baseLayer.key === key) {
    return;
  }

  host.baseLayer.key = key;
  const pixelW = Math.max(1, Math.ceil(width * dpr));
  const pixelH = Math.max(1, Math.ceil(height * dpr));
  if (host.baseLayer.canvas.width !== pixelW) {
    host.baseLayer.canvas.width = pixelW;
  }
  if (host.baseLayer.canvas.height !== pixelH) {
    host.baseLayer.canvas.height = pixelH;
  }

  const ctx = host.baseLayer.ctx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const bgImage =
    !!host.backgroundImageSrc &&
    host.bgImageLoaded &&
    !!host.bgImage &&
    host.bgImageNaturalW > 0 &&
    host.bgImageNaturalH > 0
      ? (host.bgImage as unknown as CanvasImageSource)
      : null;

  renderBaseLayer(
    ctx,
    key,
    width,
    height,
    theme,
    radius,
    windowX,
    windowY,
    windowW,
    windowH,
    windowR,
    bgImage,
    host.bgImageNaturalW,
    host.bgImageNaturalH,
  );
}
