import { clamp } from './glass-card-utils';

import type { ThemePalette } from '@/styles/theme';

import { Themes } from '@/styles/theme';

type WindowRect = { x: number; y: number; width: number; height: number; radius?: number };
type SuggestedTextStyle = { fill: string; stroke: string };

/**
 * @description 计算 GlassCardComposite 的窗口与内容布局，并给出文本采样矩形与默认文字样式。
 * @param width 卡片宽度
 * @param height 卡片高度
 * @param windowRatio 默认窗口宽度占比（0.2–0.5）
 * @param windowRect 可选：显式窗口矩形
 * @param theme 主题色板（用于默认文字样式回退）
 * @param textStyle 可选：采样得到的文字样式
 * @returns 布局结果（padding、窗口矩形、内容宽度、采样区域、文字样式）
 * @example
 * ```ts
 * import { resolveGlassCardCompositeLayout } from
 *   '@/demo/glass-card/widgets/glass-card/glass-card-composite-layout';
 * import { Themes } from '@/styles/theme';
 *
 * const layout = resolveGlassCardCompositeLayout({
 *   width: 520,
 *   height: 260,
 *   windowRatio: 0.32,
 *   theme: Themes.light,
 * });
 * ```
 */
export function resolveGlassCardCompositeLayout({
  width,
  height,
  windowRatio,
  windowRect,
  theme,
  textStyle,
}: {
  width: number;
  height: number;
  windowRatio: number;
  windowRect?: WindowRect;
  theme?: ThemePalette;
  textStyle: SuggestedTextStyle | null;
}) {
  const padding = Math.max(12, Math.min(20, Math.min(width, height) * 0.06));
  const radius = Math.min(24, height * 0.12);
  const ratio = clamp(windowRatio, 0.2, 0.5);

  let windowX: number;
  let windowY: number;
  let windowW: number;
  let windowH: number;
  let windowR: number;

  if (windowRect) {
    const resolvedW = clamp(windowRect.width, 16, width);
    const resolvedH = clamp(windowRect.height, 16, height);
    windowX = clamp(windowRect.x, 0, Math.max(0, width - resolvedW));
    windowY = clamp(windowRect.y, 0, Math.max(0, height - resolvedH));
    windowW = resolvedW;
    windowH = resolvedH;
    windowR = clamp(
      typeof windowRect.radius === 'number' ? windowRect.radius : Math.min(radius * 0.7, 14),
      0,
      Math.min(resolvedW, resolvedH) / 2,
    );
  } else {
    windowW = clamp(width * ratio, 88, Math.min(180, width - padding * 2 - 40));
    windowH = clamp(height - padding * 2, 96, height - padding * 2);
    windowX = width - padding - windowW;
    windowY = (height - windowH) / 2;
    windowR = Math.min(radius * 0.7, 14);
  }

  const leftContentW = Math.max(0, windowX - padding * 2);
  const sampleRect = {
    x: padding,
    y: Math.max(0, (height - height * 0.6) / 2),
    width: leftContentW,
    height: height * 0.6,
  };

  const palette = theme ?? Themes.light;
  const resolvedTextStyle = textStyle ?? {
    fill: palette.text.primary,
    stroke: palette.background.base,
  };

  return {
    padding,
    windowRect: { x: windowX, y: windowY, width: windowW, height: windowH, radius: windowR },
    leftContentW,
    sampleRect,
    textStyle: resolvedTextStyle,
  };
}
