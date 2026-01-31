import { computeWindowLayout } from './frosted-glass-card-window-layout';

import type { ThemePalette } from '@/styles/theme';

import { Themes } from '@/styles/theme';

type StaticCacheHost = {
  theme?: ThemePalette;
  backgroundImageSrc?: string;
  bgImageVersion: number;
  windowDisabled: boolean;
  windowRatio: number;
  layoutCache: {
    layoutW: number;
    layoutH: number;
    radius: number;
    padding: number;
    windowDisabled: boolean;
    hasWindowRect: boolean;
    windowRatio: number;
    windowRectX: number;
    windowRectY: number;
    windowRectW: number;
    windowRectH: number;
    windowRectRadius: number | null;
    windowX: number;
    windowY: number;
    windowW: number;
    windowH: number;
    windowR: number;
  };
  getDpr(): number;
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
  ): void;
};

/**
 * @description 更新离屏底图与窗口布局缓存，确保同 key 下复用同一 canvas。
 * @param host FrostedGlassCard 实例（或等价宿主）
 * @param width 当前布局宽度
 * @param height 当前布局高度
 * @returns void
 * @example
 * ```ts
 * // 由 FrostedGlassCard 内部调用：外部通常不需要直接使用
 * ```
 */
export function updateStaticCaches(host: StaticCacheHost, width: number, height: number) {
  const dpr = host.getDpr();
  const theme = host.theme ?? Themes.light;
  const radius = Math.min(24, height * 0.12);
  const padding = Math.max(12, Math.min(20, Math.min(width, height) * 0.06));

  computeWindowLayout(host, width, height, radius, padding);
  const { windowX, windowY, windowW, windowH, windowR } = host.layoutCache;

  const q = (v: number) => Math.round(v * dpr);
  // baseKey 覆盖“尺寸/窗口/主题/底图版本”等静态因子：key 不变时复用离屏 canvas，避免重复绘制底图
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
    host.backgroundImageSrc ?? '',
    host.bgImageVersion.toFixed(0),
    theme.primary,
    theme.secondary,
    theme.background.container,
    theme.background.surface,
  ].join('|');

  host.ensureBaseLayer(
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
