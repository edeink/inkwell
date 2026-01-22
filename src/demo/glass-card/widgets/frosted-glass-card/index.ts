import type { BoxConstraints, BuildContext, WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Widget } from '@/core/base';
import { Themes } from '@/styles/theme';

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

function averageRegionRGBA(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): { r: number; g: number; b: number; a: number } | null {
  const w = Math.max(0, Math.floor(width));
  const h = Math.max(0, Math.floor(height));
  if (w <= 0 || h <= 0) {
    return null;
  }
  const readX = Math.max(0, Math.floor(x));
  const readY = Math.max(0, Math.floor(y));
  let img: ImageData;
  try {
    img = (ctx as CanvasRenderingContext2D).getImageData(readX, readY, w, h);
  } catch {
    return null;
  }
  const data = img.data;
  if (!data || data.length < 4) {
    return null;
  }

  const pixelCount = w * h;
  const targetSamples = 1200;
  const stride = Math.max(1, Math.floor(Math.sqrt(pixelCount / targetSamples)));
  const step = stride * 4;

  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sa = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += step) {
    const a = data[i + 3] / 255;
    if (a <= 0) {
      continue;
    }
    sr += data[i] * a;
    sg += data[i + 1] * a;
    sb += data[i + 2] * a;
    sa += a;
    n++;
  }
  if (n <= 0 || sa <= 0) {
    return null;
  }
  return { r: sr / sa, g: sg / sa, b: sb / sa, a: sa / n };
}

function pickTextFillAndStroke(avg: { r: number; g: number; b: number; a: number } | null): {
  fill: string;
  stroke: string;
} {
  if (!avg) {
    return { fill: '#ffffff', stroke: 'rgba(0,0,0,0.65)' };
  }
  const lum = (0.2126 * avg.r + 0.7152 * avg.g + 0.0722 * avg.b) / 255;
  if (lum < 0.55) {
    return { fill: '#ffffff', stroke: 'rgba(0,0,0,0.65)' };
  }
  return { fill: '#111111', stroke: 'rgba(255,255,255,0.7)' };
}

function toSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded01(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return (s & 0xffffffff) / 0x100000000;
  };
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, Math.min(width, height) / 2));
  const roundRect = (
    ctx as unknown as {
      roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
    }
  ).roundRect;
  if (typeof roundRect === 'function') {
    roundRect.call(ctx as never, x, y, width, height, rr);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + width - rr, y);
  ctx.arcTo(x + width, y, x + width, y + rr, rr);
  ctx.lineTo(x + width, y + height - rr);
  ctx.arcTo(x + width, y + height, x + width - rr, y + height, rr);
  ctx.lineTo(x + rr, y + height);
  ctx.arcTo(x, y + height, x, y + height - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
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
  private backgroundImageSrc?: string;

  private bgImage: HTMLImageElement | null = null;
  private bgImageLoaded: boolean = false;
  private bgImageNaturalW: number = 0;
  private bgImageNaturalH: number = 0;
  private bgImageVersion: number = 0;

  private rafId: number | null = null;
  private timeMs: number = 0;

  private baseLayer: CachedLayer | null = null;

  createElement(data: FrostedGlassCardProps): Widget<FrostedGlassCardProps> {
    super.createElement(data);
    this.cardW = typeof data.width === 'number' ? data.width : undefined;
    this.cardH = typeof data.height === 'number' ? data.height : undefined;
    this.theme = data.theme;
    this.animate = data.animate !== false;
    this.blurPx = typeof data.blurPx === 'number' ? clamp(data.blurPx, 0, 40) : 10;
    this.glassAlpha = typeof data.glassAlpha === 'number' ? clamp(data.glassAlpha, 0, 1) : 0.18;
    this.windowRatio =
      typeof data.windowRatio === 'number' ? clamp(data.windowRatio, 0.2, 0.5) : 0.32;
    this.windowRect =
      data.windowRect &&
      typeof data.windowRect.x === 'number' &&
      typeof data.windowRect.y === 'number' &&
      typeof data.windowRect.width === 'number' &&
      typeof data.windowRect.height === 'number'
        ? data.windowRect
        : undefined;
    this.textSampleRect =
      data.textSampleRect &&
      typeof data.textSampleRect.x === 'number' &&
      typeof data.textSampleRect.y === 'number' &&
      typeof data.textSampleRect.width === 'number' &&
      typeof data.textSampleRect.height === 'number'
        ? data.textSampleRect
        : undefined;
    this.onSuggestedTextStyleChange =
      typeof data.onSuggestedTextStyleChange === 'function'
        ? data.onSuggestedTextStyleChange
        : undefined;
    this.syncBackgroundImage(data.backgroundImageSrc);
    return this;
  }

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
      this.markNeedsPaint();
    };
    img.src = next;
    this.bgImage = img;
    this.markNeedsPaint();
  }

  protected performLayout(constraints: BoxConstraints): { width: number; height: number } {
    const maxW = Number.isFinite(constraints.maxWidth) ? constraints.maxWidth : 360;
    const maxH = Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : 240;
    const minW = Number.isFinite(constraints.minWidth) ? constraints.minWidth : 0;
    const minH = Number.isFinite(constraints.minHeight) ? constraints.minHeight : 0;

    const w0 = typeof this.cardW === 'number' ? this.cardW : Math.min(520, maxW);
    const h0 =
      typeof this.cardH === 'number' ? this.cardH : Math.min(320, maxH, Math.max(180, w0 * 0.58));

    return { width: clamp(w0, minW, maxW), height: clamp(h0, minH, maxH) };
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
      } catch {}
      this.rafId = null;
    }
    this.baseLayer = null;
    this.bgImage = null;
    super.dispose();
  }

  protected paintSelf(context: BuildContext): void {
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

    const dpr = renderer.getResolution?.() ?? 1;
    const radius = Math.min(24, height * 0.12);
    const padding = Math.max(12, Math.min(20, Math.min(width, height) * 0.06));
    let windowX = 0;
    let windowY = 0;
    let windowW = 0;
    let windowH = 0;
    let windowR = 0;
    if (this.windowRect) {
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
      windowW = clamp(width * this.windowRatio, 88, Math.min(180, width - padding * 2 - 40));
      windowH = clamp(height - padding * 2, 96, height - padding * 2);
      windowX = width - padding - windowW;
      windowY = (height - windowH) / 2;
      windowR = Math.min(radius * 0.7, 14);
    }

    const baseKey = [
      'base',
      width.toFixed(2),
      height.toFixed(2),
      dpr.toFixed(2),
      windowX.toFixed(2),
      windowY.toFixed(2),
      windowW.toFixed(2),
      windowH.toFixed(2),
      windowR.toFixed(2),
      this.backgroundImageSrc ?? '',
      this.bgImageVersion.toFixed(0),
      theme.primary,
      theme.secondary,
      theme.background.container,
      theme.background.surface,
      theme.text.primary,
      theme.text.secondary,
      theme.border.base,
      theme.border.secondary,
    ].join('|');
    this.ensureBaseLayer(
      baseKey,
      width,
      height,
      dpr,
      theme,
      radius,
      padding,
      windowX,
      windowY,
      windowW,
      windowH,
      windowR,
    );

    ctx.save();
    ctx.beginPath();
    roundedRectPath(ctx, 0, 0, width, height, radius);
    ctx.clip();

    const baseImage = this.baseLayer!.canvas as unknown as CanvasImageSource;
    ctx.drawImage(baseImage, 0, 0, width, height);

    this.paintFrostedOverlay(
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
    );

    this.paintClearWindow(ctx, width, height, windowX, windowY, windowW, windowH, windowR);

    this.paintWindowFrame(ctx, theme, width, height, windowX, windowY, windowW, windowH, windowR);

    ctx.restore();
  }

  private ensureBaseLayer(
    key: string,
    width: number,
    height: number,
    dpr: number,
    theme: ThemePalette,
    radius: number,
    padding: number,
    windowX: number,
    windowY: number,
    windowW: number,
    windowH: number,
    windowR: number,
  ) {
    /**
     * 底图只负责“可被磨砂/清晰窗口复用”的静态内容：
     * - 背景渐变与装饰斑点
     * - 窗口底色（用于清晰窗口区域）
     *
     * 文本等应当作为上层组件叠加，避免被磨砂层二次采样后产生模糊。
     */
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
    void padding;
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

    ctx.save();
    ctx.beginPath();
    roundedRectPath(ctx, 0, 0, width, height, radius);
    ctx.clip();

    const hasBgImage =
      !!this.backgroundImageSrc &&
      this.bgImageLoaded &&
      !!this.bgImage &&
      this.bgImageNaturalW > 0 &&
      this.bgImageNaturalH > 0;

    if (hasBgImage) {
      const iw = this.bgImageNaturalW;
      const ih = this.bgImageNaturalH;
      const scale = Math.max(width / iw, height / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2;
      ctx.drawImage(this.bgImage as unknown as CanvasImageSource, dx, dy, dw, dh);
    } else {
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, theme.background.container);
      bg.addColorStop(0.55, theme.background.surface);
      bg.addColorStop(1, theme.background.container);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const rnd = seeded01(toSeed(key));
      const blobs = 7;
      for (let i = 0; i < blobs; i++) {
        const cx = width * (0.15 + rnd() * 0.7);
        const cy = height * (0.15 + rnd() * 0.7);
        const r = Math.min(width, height) * (0.18 + rnd() * 0.25);
        const alpha = 0.08 + rnd() * 0.08;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = i % 2 ? theme.primary : theme.secondary;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = theme.background.container;
      ctx.beginPath();
      roundedRectPath(ctx, windowX, windowY, windowW, windowH, windowR);
      ctx.fill();
      ctx.globalAlpha = 1;

      const winGrad = ctx.createLinearGradient(
        windowX,
        windowY,
        windowX + windowW,
        windowY + windowH,
      );
      winGrad.addColorStop(0, theme.background.surface);
      winGrad.addColorStop(1, theme.background.container);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = winGrad;
      ctx.beginPath();
      roundedRectPath(ctx, windowX, windowY, windowW, windowH, windowR);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (this.textSampleRect && this.onSuggestedTextStyleChange) {
      const sr = this.textSampleRect;
      const sx = clamp(sr.x, 0, width);
      const sy = clamp(sr.y, 0, height);
      const sw = clamp(sr.width, 0, Math.max(0, width - sx));
      const sh = clamp(sr.height, 0, Math.max(0, height - sy));
      const avg = averageRegionRGBA(ctx, sx * dpr, sy * dpr, sw * dpr, sh * dpr);
      const style = pickTextFillAndStroke(avg);
      const nextKey = `${key}|${style.fill}|${style.stroke}`;
      if (this.lastSuggestedTextStyleKey !== nextKey) {
        this.lastSuggestedTextStyleKey = nextKey;
        const cb = this.onSuggestedTextStyleChange;
        if (typeof queueMicrotask === 'function') {
          queueMicrotask(() => {
            if (!this.isDisposed()) {
              cb(style);
            }
          });
        } else {
          setTimeout(() => {
            if (!this.isDisposed()) {
              cb(style);
            }
          }, 0);
        }
      }
    }

    ctx.restore();
  }

  private paintFrostedOverlay(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    radius: number,
    windowX: number,
    windowY: number,
    windowW: number,
    windowH: number,
    windowR: number,
  ) {
    ctx.save();

    ctx.beginPath();
    roundedRectPath(ctx, 0, 0, width, height, radius);
    roundedRectPath(ctx, windowX, windowY, windowW, windowH, windowR);
    try {
      ctx.clip('evenodd');
    } catch {
      ctx.clip();
    }

    const supportsFilter = 'filter' in ctx;
    if (supportsFilter && this.blurPx > 0) {
      const prev = ctx.filter;
      ctx.filter = `blur(${this.blurPx}px)`;
      const baseImage = this.baseLayer!.canvas as unknown as CanvasImageSource;
      ctx.drawImage(baseImage, 0, 0, width, height);
      ctx.filter = prev;
    } else if (this.blurPx > 0) {
      const samples = 8;
      const spread = Math.max(1, this.blurPx * 0.25);
      ctx.globalAlpha = 1 / (samples * 2 + 1);
      const baseImage = this.baseLayer!.canvas as unknown as CanvasImageSource;
      for (let i = -samples; i <= samples; i++) {
        const dx = i * spread;
        ctx.drawImage(baseImage, dx, 0, width, height);
      }
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = this.glassAlpha;
    ctx.fillStyle = theme.background.container;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;

    const t = this.timeMs * 0.001;
    const sweep = (Math.sin(t * 0.9) * 0.5 + 0.5) * width;
    const g = ctx.createLinearGradient(sweep - width * 0.6, 0, sweep + width * 0.6, height);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = theme.border.base;
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundedRectPath(ctx, 0.5, 0.5, width - 1, height - 1, radius);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private paintClearWindow(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    windowX: number,
    windowY: number,
    windowW: number,
    windowH: number,
    windowR: number,
  ) {
    if (!this.baseLayer) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    roundedRectPath(ctx, windowX, windowY, windowW, windowH, windowR);
    ctx.clip();
    const baseImage = this.baseLayer.canvas as unknown as CanvasImageSource;
    ctx.drawImage(baseImage, 0, 0, width, height);
    ctx.restore();
  }

  private paintWindowFrame(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    windowX: number,
    windowY: number,
    windowW: number,
    windowH: number,
    windowR: number,
  ) {
    void width;
    void height;
    ctx.save();

    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = theme.border.base;
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundedRectPath(ctx, windowX + 0.5, windowY + 0.5, windowW - 1, windowH - 1, windowR);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
  }
}
