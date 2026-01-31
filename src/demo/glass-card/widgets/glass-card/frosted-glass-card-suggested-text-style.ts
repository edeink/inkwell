import { clamp } from './glass-card-utils';

import type { ThemePalette } from '@/styles/theme';

import {
  averageRegionRGBA,
  averageRegionRGBAFast,
  parseHexColorToRGBA,
  pickTextFillAndStroke,
  type RGBA,
} from '@/demo/glass-card/helpers/color-sampling';
import { Themes } from '@/styles/theme';

type SuggestedTextStyle = { fill: string; stroke: string };

type SuggestedTextStyleHost = {
  theme?: ThemePalette;
  textSampleRect?: { x: number; y: number; width: number; height: number };
  onSuggestedTextStyleChange?: (style: SuggestedTextStyle) => void;
  baseLayer: {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    key: string;
  } | null;
  cachedSuggestedTextStyleSampleKey: string;
  cachedSuggestedTextStyle: SuggestedTextStyle | null;
  lastSuggestedTextStyleKey: string;
  updateStaticCaches(width: number, height: number): void;
  getDpr(): number;
  isDisposed(): boolean;
};

/**
 * @description 根据采样区域的平均底色，推导更易读的文字填充与描边色，并通过回调异步通知。
 * @param host FrostedGlassCard 实例（或等价宿主）
 * @param width 当前布局宽度
 * @param height 当前布局高度
 * @param options 强制回退主题色等选项
 * @returns void
 * @example
 * ```ts
 * // 由 FrostedGlassCard 内部调用：外部通常不需要直接使用
 * ```
 */
export function updateSuggestedTextStyle(
  host: SuggestedTextStyleHost,
  width: number,
  height: number,
  options?: { forceThemeFallback?: boolean },
) {
  const cb = host.onSuggestedTextStyleChange;
  const sr = host.textSampleRect;
  if (!cb || !sr) {
    return;
  }

  if (!host.baseLayer) {
    host.updateStaticCaches(width, height);
  }

  const dpr = host.getDpr();
  const baseKey = host.baseLayer?.key ?? '';
  const sx = clamp(sr.x, 0, width);
  const sy = clamp(sr.y, 0, height);
  const sw = clamp(sr.width, 0, Math.max(0, width - sx));
  const sh = clamp(sr.height, 0, Math.max(0, height - sy));
  const px = Math.round(sx * dpr);
  const py = Math.round(sy * dpr);
  const pw = Math.round(sw * dpr);
  const ph = Math.round(sh * dpr);

  // 采样 key 绑定“底图缓存内容 + 采样像素区域”，两者任一变化都需要重新采样
  const sampleKey = `${baseKey}|${px}|${py}|${pw}|${ph}`;
  if (host.cachedSuggestedTextStyle && host.cachedSuggestedTextStyleSampleKey === sampleKey) {
    return;
  }

  let avg: RGBA | null = null;
  if (options?.forceThemeFallback) {
    // 图片加载失败等场景：回退到主题容器底色，避免读取像素导致异常
    const theme = host.theme ?? Themes.light;
    avg = parseHexColorToRGBA(theme.background.container);
  } else if (host.baseLayer) {
    const baseImage = host.baseLayer.canvas as unknown as CanvasImageSource;
    avg =
      averageRegionRGBAFast(baseImage, px, py, pw, ph) ??
      averageRegionRGBA(host.baseLayer.ctx, px, py, pw, ph);
  } else {
    const theme = host.theme ?? Themes.light;
    avg = parseHexColorToRGBA(theme.background.container);
  }

  const style = pickTextFillAndStroke(avg);
  host.cachedSuggestedTextStyleSampleKey = sampleKey;
  host.cachedSuggestedTextStyle = style;

  const nextKey = `${style.fill}|${style.stroke}`;
  if (host.lastSuggestedTextStyleKey === nextKey) {
    return;
  }
  host.lastSuggestedTextStyleKey = nextKey;

  if (typeof queueMicrotask === 'function') {
    // 使用 microtask 降低在 paint 路径内直接 setState 的概率，避免同步重入
    queueMicrotask(() => {
      if (!host.isDisposed()) {
        cb(style);
      }
    });
    return;
  }

  setTimeout(() => {
    if (!host.isDisposed()) {
      cb(style);
    }
  }, 0);
}
