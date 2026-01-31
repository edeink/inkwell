import { syncBackgroundImage } from './frosted-glass-card-background';
import { ensureBaseLayer } from './frosted-glass-card-base-layer';
import { layoutFrostedGlassCard } from './frosted-glass-card-layout';
import { paintFrostedGlassCard } from './frosted-glass-card-paint-self';
import { updateStaticCaches } from './frosted-glass-card-static-caches';
import { updateSuggestedTextStyle } from './frosted-glass-card-suggested-text-style';
import { didUpdateFrostedGlassCard } from './frosted-glass-card-update';
import { clamp } from './glass-card-utils';

import type { FrostedGlassCardProps } from './glass-card-types';
import type { BoxConstraints, BuildContext } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Widget } from '@/core/base';

type CachedLayer = {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  key: string;
};

/**
 * @description FrostedGlassCard：带“磨砂遮罩 + 清晰窗口”的玻璃卡片，支持底图缓存与文字采样回调。
 * @param props 组件入参
 * @returns Widget 实例
 * @example
 * ```ts
 * import { FrostedGlassCard } from '@/demo/glass-card/widgets/glass-card';
 * import { Themes } from '@/styles/theme';
 *
 * const w = new FrostedGlassCard({ width: 520, height: 260, theme: Themes.light, animate: false });
 * ```
 */
export class FrostedGlassCard extends Widget<FrostedGlassCardProps> {
  cardW?: number;
  cardH?: number;
  theme?: ThemePalette;
  animate: boolean = true;
  blurPx: number = 10;
  glassAlpha: number = 0.18;
  windowRatio: number = 0.32;
  windowDisabled: boolean = false;
  windowRect?: { x: number; y: number; width: number; height: number; radius?: number };
  textSampleRect?: { x: number; y: number; width: number; height: number };
  onSuggestedTextStyleChange?: (style: { fill: string; stroke: string }) => void;
  lastSuggestedTextStyleKey: string = '';
  cachedSuggestedTextStyleSampleKey: string = '';
  cachedSuggestedTextStyle: { fill: string; stroke: string } | null = null;
  backgroundImageSrc?: string;
  bgImage: HTMLImageElement | null = null;
  bgImageLoaded: boolean = false;
  bgImageNaturalW: number = 0;
  bgImageNaturalH: number = 0;
  bgImageVersion: number = 0;
  rafId: number | null = null;
  timeMs: number = 0;
  baseLayer: CachedLayer | null = null;
  layoutCache = {
    layoutW: 0,
    layoutH: 0,
    radius: 0,
    padding: 0,
    windowDisabled: false,
    hasWindowRect: false,
    windowRatio: 0.32,
    windowRectX: 0,
    windowRectY: 0,
    windowRectW: 0,
    windowRectH: 0,
    windowRectRadius: null as number | null,
    windowX: 0,
    windowY: 0,
    windowW: 0,
    windowH: 0,
    windowR: 0,
  };

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
    this.windowDisabled = wr === false;
    this.windowRect =
      !this.windowDisabled &&
      wr &&
      typeof wr === 'object' &&
      typeof wr.x === 'number' &&
      typeof wr.y === 'number' &&
      typeof wr.width === 'number' &&
      typeof wr.height === 'number'
        ? wr
        : undefined;

    const sr = data.textSampleRect;
    this.textSampleRect =
      sr &&
      typeof sr.x === 'number' &&
      typeof sr.y === 'number' &&
      typeof sr.width === 'number' &&
      typeof sr.height === 'number'
        ? sr
        : undefined;

    this.onSuggestedTextStyleChange =
      typeof data.onSuggestedTextStyleChange === 'function'
        ? data.onSuggestedTextStyleChange
        : undefined;

    syncBackgroundImage(this, data.backgroundImageSrc);
    const el = super.createElement(data);
    if (data.isRepaintBoundary == null) {
      this.isRepaintBoundary = true;
    }
    return el;
  }

  protected didUpdateWidget(oldProps: FrostedGlassCardProps): void {
    didUpdateFrostedGlassCard(this, oldProps);
  }

  protected performLayout(constraints: BoxConstraints): { width: number; height: number } {
    return layoutFrostedGlassCard(this, constraints);
  }

  getDpr(): number {
    const renderer = this.runtime?.getRenderer?.() ?? null;
    const dpr = renderer?.getResolution?.() ?? 1;
    return typeof dpr === 'number' && Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  }

  updateStaticCaches(width: number, height: number) {
    updateStaticCaches(this, width, height);
  }

  updateSuggestedTextStyle(
    width: number,
    height: number,
    options?: { forceThemeFallback?: boolean },
  ) {
    updateSuggestedTextStyle(this, width, height, options);
  }

  ensureBaseLayer(
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
    ensureBaseLayer(
      this,
      key,
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
    this.startAnimationLoop();
    paintFrostedGlassCard(this, context);
  }
}
