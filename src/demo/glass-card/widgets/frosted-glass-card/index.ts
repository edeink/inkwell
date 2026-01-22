import type { BoxConstraints, BuildContext, WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Widget } from '@/core/base';
import { roundedRectPath } from '@/demo/glass-card/helpers/canvas';
import {
  averageRegionRGBA,
  averageRegionRGBAFast,
  parseHexColorToRGBA,
  pickTextFillAndStroke,
  type RGBA,
} from '@/demo/glass-card/helpers/color-sampling';
import {
  paintClearWindow,
  paintFrostedOverlay,
  paintWindowFrame,
  renderBaseLayer,
} from '@/demo/glass-card/helpers/frosted-glass-card-paint';
import { Themes } from '@/styles/theme';

/**
 * FrostedGlassCard：带“磨砂遮罩 + 清晰窗口”的玻璃卡片。
 *
 * 绘制分层：
 * - baseLayer：缓存底图（背景/装饰/窗口底色），仅在布局/主题/背景图等变化时重建；
 * - 画布上层：磨砂覆盖层、清晰窗口裁剪与描边。
 *
 * 该组件会在需要时对指定区域做一次采样，用于推荐文字填充/描边颜色。
 * 为避免每帧反复读取像素，这里对采样结果做了缓存，并优先使用 1x1 缩放采样以降低开销。
 */
export interface FrostedGlassCardProps extends WidgetProps {
  /**
   * 期望的卡片宽度；若不传则按约束自适配。
   */
  width?: number;
  /**
   * 期望的卡片高度；若不传则按约束自适配。
   */
  height?: number;
  /**
   * 主题色板；不传则使用 light。
   */
  theme?: ThemePalette;
  /**
   * 是否启用 60fps 动画高光扫光；默认 true。
   */
  animate?: boolean;
  /**
   * 模糊强度（px），用于磨砂效果；默认 10，范围 0~40。
   */
  blurPx?: number;
  /**
   * 玻璃覆盖层不透明度；默认 0.18，范围 0~1。
   */
  glassAlpha?: number;
  /**
   * 右侧清晰窗口宽度占比；默认 0.32，范围 0.2~0.5。
   */
  windowRatio?: number;

  windowRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
  };

  textSampleRect?: { x: number; y: number; width: number; height: number };

  onSuggestedTextStyleChange?: (style: { fill: string; stroke: string }) => void;

  /**
   * 背景图片地址（可选）。
   *
   * 行为：
   * - 图片以 cover 模式铺满整张卡片（短边撑满、长边裁剪），并保持居中。
   * - 磨砂层会对“窗口外区域”的底图进行模糊；清晰窗口区域保持不模糊。
   */
  backgroundImageSrc?: string;
}

type CachedLayer = {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  key: string;
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export class FrostedGlassCard extends Widget<FrostedGlassCardProps> {
  private cardW?: number;
  private cardH?: number;
  private theme?: ThemePalette;
  private animate: boolean = true;
  private blurPx: number = 10;
  private glassAlpha: number = 0.18;
  private windowRatio: number = 0.32;
  private windowRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
  };
  private textSampleRect?: { x: number; y: number; width: number; height: number };
  private onSuggestedTextStyleChange?: (style: { fill: string; stroke: string }) => void;
  private lastSuggestedTextStyleKey: string = '';
  /**
   * 文本样式采样缓存：当布局/采样区域不变时，避免重复做像素读取。
   * key 由 baseLayer.key + 采样像素区域共同组成。
   */
  private cachedSuggestedTextStyleSampleKey: string = '';
  private cachedSuggestedTextStyle: { fill: string; stroke: string } | null = null;
  private backgroundImageSrc?: string;

  private bgImage: HTMLImageElement | null = null;
  private bgImageLoaded: boolean = false;
  private bgImageNaturalW: number = 0;
  private bgImageNaturalH: number = 0;
  private bgImageVersion: number = 0;

  private rafId: number | null = null;
  private timeMs: number = 0;

  private baseLayer: CachedLayer | null = null;
  private cachedLayoutW: number = 0;
  private cachedLayoutH: number = 0;
  private cachedRadius: number = 0;
  private cachedPadding: number = 0;
  private cachedWindowX: number = 0;
  private cachedWindowY: number = 0;
  private cachedWindowW: number = 0;
  private cachedWindowH: number = 0;
  private cachedWindowR: number = 0;
  private cachedHasWindowRect: boolean = false;
  private cachedWindowRatio: number = 0.32;
  private cachedWindowRectX: number = 0;
  private cachedWindowRectY: number = 0;
  private cachedWindowRectW: number = 0;
  private cachedWindowRectH: number = 0;
  private cachedWindowRectRadius: number | null = null;

  /**
   * 解析 props 并同步到实例字段。
   * 约定：这个组件用字段缓存解析后的值，避免 paint/build 中反复做 clamp/分支判断。
   */
  createElement(data: FrostedGlassCardProps): Widget<FrostedGlassCardProps> {
    this.cardW = typeof data.width === 'number' ? data.width : undefined;
    this.cardH = typeof data.height === 'number' ? data.height : undefined;
    this.theme = data.theme;
    this.animate = data.animate !== false;
    this.blurPx = typeof data.blurPx === 'number' ? clamp(data.blurPx, 0, 40) : 10;
    this.glassAlpha = typeof data.glassAlpha === 'number' ? clamp(data.glassAlpha, 0, 1) : 0.18;
    this.windowRatio =
      typeof data.windowRatio === 'number' ? clamp(data.windowRatio, 0.2, 0.5) : 0.32;
    const wr = data.windowRect;
    this.windowRect = undefined;
    if (
      wr &&
      typeof wr.x === 'number' &&
      typeof wr.y === 'number' &&
      typeof wr.width === 'number' &&
      typeof wr.height === 'number'
    ) {
      this.windowRect = wr;
    }
    const sr = data.textSampleRect;
    this.textSampleRect = undefined;
    if (
      sr &&
      typeof sr.x === 'number' &&
      typeof sr.y === 'number' &&
      typeof sr.width === 'number' &&
      typeof sr.height === 'number'
    ) {
      this.textSampleRect = sr;
    }
    this.onSuggestedTextStyleChange =
      typeof data.onSuggestedTextStyleChange === 'function'
        ? data.onSuggestedTextStyleChange
        : undefined;
    this.syncBackgroundImage(data.backgroundImageSrc);
    return super.createElement(data);
  }

  /**
   * 同步背景图资源：
   * - src 变化时创建新 Image 并异步加载
   * - onload 后刷新底图缓存，并在需要时触发一次文本样式采样
   */
  private syncBackgroundImage(src: string | undefined) {
    const next = typeof src === 'string' && src.trim().length > 0 ? src : undefined;
    if (next === this.backgroundImageSrc) {
      return;
    }
    this.backgroundImageSrc = next;
    this.bgImageLoaded = false;
    this.bgImageNaturalW = 0;
    this.bgImageNaturalH = 0;
    this.bgImageVersion++;

    if (!next) {
      this.bgImage = null;
      this.markNeedsPaint();
      return;
    }

    if (typeof Image === 'undefined') {
      this.bgImage = null;
      this.markNeedsPaint();
      return;
    }

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (this.isDisposed()) {
        return;
      }
      if (this.backgroundImageSrc !== next) {
        return;
      }
      this.bgImageLoaded = true;
      this.bgImageNaturalW = img.naturalWidth || 0;
      this.bgImageNaturalH = img.naturalHeight || 0;
      this.bgImageVersion++;
      const { width, height } = this.renderObject.size;
      if (width > 0 && height > 0) {
        this.updateStaticCaches(width, height);
        this.updateSuggestedTextStyle(width, height);
      }
      this.markNeedsPaint();
    };
    img.onerror = () => {
      if (this.isDisposed()) {
        return;
      }
      if (this.backgroundImageSrc !== next) {
        return;
      }
      this.bgImage = null;
      this.bgImageLoaded = false;
      this.bgImageNaturalW = 0;
      this.bgImageNaturalH = 0;
      this.bgImageVersion++;
      const { width, height } = this.renderObject.size;
      if (width > 0 && height > 0) {
        this.updateStaticCaches(width, height);
        this.updateSuggestedTextStyle(width, height, { forceThemeFallback: true });
      }
      this.markNeedsPaint();
    };
    img.src = next;
    this.bgImage = img;
    this.markNeedsPaint();
  }

  private isSameWindowRect(
    a: FrostedGlassCardProps['windowRect'] | undefined,
    b: FrostedGlassCardProps['windowRect'] | undefined,
  ): boolean {
    if (a === b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return (
      a.x === b.x &&
      a.y === b.y &&
      a.width === b.width &&
      a.height === b.height &&
      (a.radius ?? null) === (b.radius ?? null)
    );
  }

  private isSameRect(
    a: FrostedGlassCardProps['textSampleRect'] | undefined,
    b: FrostedGlassCardProps['textSampleRect'] | undefined,
  ): boolean {
    if (a === b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
  }

  protected didUpdateWidget(oldProps: FrostedGlassCardProps): void {
    // 约定：尺寸变化走 markNeedsLayout，其它变化尽量只走 markNeedsPaint
    const next = this.data;
    const sizeRelatedChanged = oldProps.width !== next.width || oldProps.height !== next.height;

    const themeChanged = oldProps.theme !== next.theme;
    const blurChanged = oldProps.blurPx !== next.blurPx;
    const glassAlphaChanged = oldProps.glassAlpha !== next.glassAlpha;
    const animateChanged = oldProps.animate !== next.animate;

    const windowRatioChanged = oldProps.windowRatio !== next.windowRatio;
    const windowRectChanged = !this.isSameWindowRect(oldProps.windowRect, next.windowRect);

    const sampleRectChanged = !this.isSameRect(oldProps.textSampleRect, next.textSampleRect);
    const suggestedCbChanged =
      oldProps.onSuggestedTextStyleChange !== next.onSuggestedTextStyleChange;

    const bgChanged = oldProps.backgroundImageSrc !== next.backgroundImageSrc;

    if (sizeRelatedChanged) {
      this.markNeedsLayout();
      return;
    }

    // baseLayer 相关变更：会导致底图缓存 key 变化，需要重建底图内容
    const baseLayerRelatedChanged =
      themeChanged || windowRatioChanged || windowRectChanged || bgChanged;
    // 文本采样相关变更：需要清空采样缓存，并在布局尺寸有效时重新采样
    const samplingRelatedChanged =
      baseLayerRelatedChanged || sampleRectChanged || suggestedCbChanged;
    if (samplingRelatedChanged) {
      this.cachedSuggestedTextStyleSampleKey = '';
      this.cachedSuggestedTextStyle = null;
      if (suggestedCbChanged) {
        this.lastSuggestedTextStyleKey = '';
      }
    }

    const { width, height } = this.renderObject.size;
    if (baseLayerRelatedChanged && width > 0 && height > 0) {
      this.updateStaticCaches(width, height);
    }
    if (samplingRelatedChanged && width > 0 && height > 0) {
      this.updateSuggestedTextStyle(width, height);
    }

    const paintRelatedChanged =
      blurChanged ||
      glassAlphaChanged ||
      animateChanged ||
      baseLayerRelatedChanged ||
      sampleRectChanged ||
      suggestedCbChanged;
    if (paintRelatedChanged) {
      this.markNeedsPaint();
    }
  }

  protected performLayout(constraints: BoxConstraints): { width: number; height: number } {
    // 这里决定最终尺寸，并在尺寸有效时更新静态缓存（baseLayer）
    const maxW = Number.isFinite(constraints.maxWidth) ? constraints.maxWidth : 360;
    const maxH = Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : 240;
    const minW = Number.isFinite(constraints.minWidth) ? constraints.minWidth : 0;
    const minH = Number.isFinite(constraints.minHeight) ? constraints.minHeight : 0;

    const w0 = typeof this.cardW === 'number' ? this.cardW : Math.min(520, maxW);
    const h0 =
      typeof this.cardH === 'number' ? this.cardH : Math.min(320, maxH, Math.max(180, w0 * 0.58));

    const width = clamp(w0, minW, maxW);
    const height = clamp(h0, minH, maxH);
    if (width > 0 && height > 0) {
      this.updateStaticCaches(width, height);
    }
    return { width, height };
  }

  private getDpr(): number {
    const renderer = this.runtime?.getRenderer?.() ?? null;
    const dpr = renderer?.getResolution?.() ?? 1;
    return typeof dpr === 'number' && Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  }

  private computeWindowLayout(width: number, height: number, radius: number, padding: number) {
    // windowRect 优先生效；否则使用 windowRatio 推导默认窗口位置
    this.cachedLayoutW = width;
    this.cachedLayoutH = height;
    this.cachedRadius = radius;
    this.cachedPadding = padding;
    let windowX = 0;
    let windowY = 0;
    let windowW = 0;
    let windowH = 0;
    let windowR = 0;
    if (this.windowRect) {
      this.cachedHasWindowRect = true;
      this.cachedWindowRatio = this.windowRatio;
      this.cachedWindowRectX = this.windowRect.x;
      this.cachedWindowRectY = this.windowRect.y;
      this.cachedWindowRectW = this.windowRect.width;
      this.cachedWindowRectH = this.windowRect.height;
      this.cachedWindowRectRadius =
        typeof this.windowRect.radius === 'number' ? this.windowRect.radius : null;
      const x = this.windowRect.x;
      const y = this.windowRect.y;
      const w = this.windowRect.width;
      const h = this.windowRect.height;
      windowW = clamp(w, 16, width);
      windowH = clamp(h, 16, height);
      windowX = clamp(x, 0, Math.max(0, width - windowW));
      windowY = clamp(y, 0, Math.max(0, height - windowH));
      const r =
        typeof this.windowRect.radius === 'number'
          ? this.windowRect.radius
          : Math.min(radius * 0.7, 14);
      windowR = clamp(r, 0, Math.min(windowW, windowH) / 2);
    } else {
      this.cachedHasWindowRect = false;
      this.cachedWindowRatio = this.windowRatio;
      this.cachedWindowRectX = 0;
      this.cachedWindowRectY = 0;
      this.cachedWindowRectW = 0;
      this.cachedWindowRectH = 0;
      this.cachedWindowRectRadius = null;
      windowW = clamp(width * this.windowRatio, 88, Math.min(180, width - padding * 2 - 40));
      windowH = clamp(height - padding * 2, 96, height - padding * 2);
      windowX = width - padding - windowW;
      windowY = (height - windowH) / 2;
      windowR = Math.min(radius * 0.7, 14);
    }
    this.cachedWindowX = windowX;
    this.cachedWindowY = windowY;
    this.cachedWindowW = windowW;
    this.cachedWindowH = windowH;
    this.cachedWindowR = windowR;
  }

  private updateStaticCaches(width: number, height: number) {
    // 计算底图 key：只要 key 变化就重绘 baseLayer，但复用同一个离屏 canvas
    const dpr = this.getDpr();
    const theme = this.theme ?? Themes.light;
    const radius = Math.min(24, height * 0.12);
    const padding = Math.max(12, Math.min(20, Math.min(width, height) * 0.06));
    this.computeWindowLayout(width, height, radius, padding);
    const windowX = this.cachedWindowX;
    const windowY = this.cachedWindowY;
    const windowW = this.cachedWindowW;
    const windowH = this.cachedWindowH;
    const windowR = this.cachedWindowR;

    const q = (v: number) => Math.round(v * dpr);
    const baseKey = [
      'base',
      q(width),
      q(height),
      Math.round(dpr * 100),
      q(windowX),
      q(windowY),
      q(windowW),
      q(windowH),
      q(windowR),
      this.backgroundImageSrc ?? '',
      this.bgImageVersion.toFixed(0),
      theme.primary,
      theme.secondary,
      theme.background.container,
      theme.background.surface,
    ].join('|');

    this.ensureBaseLayer(
      baseKey,
      width,
      height,
      dpr,
      theme,
      radius,
      windowX,
      windowY,
      windowW,
      windowH,
      windowR,
    );
  }

  private updateSuggestedTextStyle(
    width: number,
    height: number,
    options?: { forceThemeFallback?: boolean },
  ) {
    // 采样结果会缓存起来，paint/performLayout 中只读取缓存，避免每帧 getImageData
    const cb = this.onSuggestedTextStyleChange;
    const sr = this.textSampleRect;
    if (!cb || !sr) {
      return;
    }

    if (!this.baseLayer) {
      this.updateStaticCaches(width, height);
    }

    const dpr = this.getDpr();
    const baseKey = this.baseLayer?.key ?? '';
    const sx = clamp(sr.x, 0, width);
    const sy = clamp(sr.y, 0, height);
    const sw = clamp(sr.width, 0, Math.max(0, width - sx));
    const sh = clamp(sr.height, 0, Math.max(0, height - sy));
    const px = Math.round(sx * dpr);
    const py = Math.round(sy * dpr);
    const pw = Math.round(sw * dpr);
    const ph = Math.round(sh * dpr);

    const sampleKey = `${baseKey}|${px}|${py}|${pw}|${ph}`;
    if (this.cachedSuggestedTextStyle && this.cachedSuggestedTextStyleSampleKey === sampleKey) {
      return;
    }

    let avg: RGBA | null = null;
    if (options?.forceThemeFallback) {
      const theme = this.theme ?? Themes.light;
      avg = parseHexColorToRGBA(theme.background.container);
    } else if (this.baseLayer) {
      const baseImage = this.baseLayer.canvas as unknown as CanvasImageSource;
      avg =
        averageRegionRGBAFast(baseImage, px, py, pw, ph) ??
        averageRegionRGBA(this.baseLayer.ctx, px, py, pw, ph);
    } else {
      const theme = this.theme ?? Themes.light;
      avg = parseHexColorToRGBA(theme.background.container);
    }

    const style = pickTextFillAndStroke(avg);
    this.cachedSuggestedTextStyleSampleKey = sampleKey;
    this.cachedSuggestedTextStyle = style;

    const nextKey = `${style.fill}|${style.stroke}`;
    if (this.lastSuggestedTextStyleKey === nextKey) {
      return;
    }
    this.lastSuggestedTextStyleKey = nextKey;

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        if (!this.isDisposed()) {
          cb(style);
        }
      });
      return;
    }

    setTimeout(() => {
      if (!this.isDisposed()) {
        cb(style);
      }
    }, 0);
  }

  private startAnimationLoop() {
    if (!this.animate) {
      return;
    }
    if (this.rafId != null) {
      return;
    }
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  private tick(t: number) {
    if (this.isDisposed()) {
      return;
    }
    this.timeMs = t;
    this.markNeedsPaint();
    this.rafId = requestAnimationFrame((next) => this.tick(next));
  }

  dispose(): void {
    if (this.rafId != null) {
      try {
        cancelAnimationFrame(this.rafId);
      } catch {
        void 0;
      }
      this.rafId = null;
    }
    this.baseLayer = null;
    this.cachedSuggestedTextStyleSampleKey = '';
    this.cachedSuggestedTextStyle = null;
    this.bgImage = null;
    super.dispose();
  }

  protected paintSelf(context: BuildContext): void {
    // 注意：paint 只做绘制与轻量计算（key 比较/矩形计算），不会做像素采样
    this.startAnimationLoop();

    const renderer = context.renderer;
    const ctx = renderer.getRawInstance?.() as CanvasRenderingContext2D | null;
    const theme = this.theme ?? Themes.light;
    const { width, height } = this.renderObject.size;
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

    const rawDpr = renderer.getResolution?.() ?? 1;
    const dpr = typeof rawDpr === 'number' && Number.isFinite(rawDpr) && rawDpr > 0 ? rawDpr : 1;
    const radius = Math.min(24, height * 0.12);
    const padding = Math.max(12, Math.min(20, Math.min(width, height) * 0.06));
    const wr = this.windowRect;
    let windowInputsChanged = false;
    if (wr) {
      windowInputsChanged =
        !this.cachedHasWindowRect ||
        this.cachedWindowRectX !== wr.x ||
        this.cachedWindowRectY !== wr.y ||
        this.cachedWindowRectW !== wr.width ||
        this.cachedWindowRectH !== wr.height ||
        this.cachedWindowRectRadius !== (typeof wr.radius === 'number' ? wr.radius : null);
    } else {
      windowInputsChanged = this.cachedHasWindowRect || this.cachedWindowRatio !== this.windowRatio;
    }
    if (
      windowInputsChanged ||
      this.cachedLayoutW !== width ||
      this.cachedLayoutH !== height ||
      this.cachedRadius !== radius ||
      this.cachedPadding !== padding
    ) {
      this.computeWindowLayout(width, height, radius, padding);
    }
    const windowX = this.cachedWindowX;
    const windowY = this.cachedWindowY;
    const windowW = this.cachedWindowW;
    const windowH = this.cachedWindowH;
    const windowR = this.cachedWindowR;

    const q = (v: number) => Math.round(v * dpr);
    const baseKey = [
      'base',
      q(width),
      q(height),
      Math.round(dpr * 100),
      q(windowX),
      q(windowY),
      q(windowW),
      q(windowH),
      q(windowR),
      this.backgroundImageSrc ?? '',
      this.bgImageVersion.toFixed(0),
      theme.primary,
      theme.secondary,
      theme.background.container,
      theme.background.surface,
    ].join('|');
    if (!this.baseLayer || this.baseLayer.key !== baseKey) {
      this.ensureBaseLayer(
        baseKey,
        width,
        height,
        dpr,
        theme,
        radius,
        windowX,
        windowY,
        windowW,
        windowH,
        windowR,
      );
    }

    ctx.save();
    ctx.beginPath();
    roundedRectPath(ctx, 0, 0, width, height, radius);
    ctx.clip();

    if (this.baseLayer) {
      const baseImage = this.baseLayer.canvas as unknown as CanvasImageSource;
      ctx.drawImage(baseImage, 0, 0, width, height);
    } else {
      ctx.fillStyle = theme.background.container;
      ctx.fillRect(0, 0, width, height);
    }

    const baseLayerCanvas = this.baseLayer
      ? (this.baseLayer.canvas as unknown as CanvasImageSource)
      : null;
    paintFrostedOverlay(
      ctx,
      theme,
      width,
      height,
      radius,
      windowX,
      windowY,
      windowW,
      windowH,
      windowR,
      baseLayerCanvas,
      this.blurPx,
      this.glassAlpha,
      this.animate,
      this.timeMs,
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

  /**
   * 确保底图缓存存在，并在 key 变化时重绘其内容。
   * 约定：canvas/context 会被复用，避免每次更新重新分配离屏资源。
   */
  private ensureBaseLayer(
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
    if (!this.baseLayer) {
      const canvas =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(1, 1)
          : (document.createElement('canvas') as HTMLCanvasElement);
      let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
      if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
        ctx = canvas.getContext('2d');
      } else {
        ctx = (canvas as HTMLCanvasElement).getContext('2d');
      }
      if (!ctx) {
        return;
      }
      this.baseLayer = { canvas, ctx, key: '' };
    }
    if (this.baseLayer.key === key) {
      return;
    }
    this.baseLayer.key = key;
    const pixelW = Math.max(1, Math.ceil(width * dpr));
    const pixelH = Math.max(1, Math.ceil(height * dpr));
    if (this.baseLayer.canvas.width !== pixelW) {
      this.baseLayer.canvas.width = pixelW;
    }
    if (this.baseLayer.canvas.height !== pixelH) {
      this.baseLayer.canvas.height = pixelH;
    }

    const ctx = this.baseLayer.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const bgImage =
      !!this.backgroundImageSrc &&
      this.bgImageLoaded &&
      !!this.bgImage &&
      this.bgImageNaturalW > 0 &&
      this.bgImageNaturalH > 0
        ? (this.bgImage as unknown as CanvasImageSource)
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
      this.bgImageNaturalW,
      this.bgImageNaturalH,
    );
  }
}
