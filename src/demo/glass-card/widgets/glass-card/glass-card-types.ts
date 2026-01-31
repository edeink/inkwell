import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

/**
 * @description FrostedGlassCard 的入参定义：支持主题、磨砂强度、透明度、清晰窗口与文本采样回调。
 * @param width 卡片宽度（不传则按布局约束推导）
 * @param height 卡片高度（不传则按布局约束推导）
 * @param theme 主题色板
 * @param animate 是否启用动态噪声/抖动（默认 true）
 * @param blurPx 模糊半径（0–40）
 * @param glassAlpha 磨砂层不透明度（0–1）
 * @param windowRatio 默认窗口宽度占比（0.2–0.5，仅在未指定 windowRect 时生效）
 * @param windowRect 清晰窗口矩形；传 false 表示禁用清晰窗口挖孔
 * @param textSampleRect 用于采样文本区域底色的矩形（用于回调建议文字样式）
 * @param onSuggestedTextStyleChange 采样建议文字样式回调（fill/stroke）
 * @param backgroundImageSrc 底图 URL（可选）
 * @returns FrostedGlassCardProps
 * @example
 * ```ts
 * import { FrostedGlassCard } from '@/demo/glass-card/widgets/glass-card';
 * import { Themes } from '@/styles/theme';
 *
 * const card = new FrostedGlassCard({
 *   width: 520,
 *   height: 260,
 *   theme: Themes.light,
 *   blurPx: 18,
 *   glassAlpha: 0.18,
 *   animate: false,
 * });
 * ```
 */
export interface FrostedGlassCardProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
  animate?: boolean;
  blurPx?: number;
  glassAlpha?: number;
  windowRatio?: number;
  windowRect?: false | { x: number; y: number; width: number; height: number; radius?: number };
  textSampleRect?: { x: number; y: number; width: number; height: number };
  onSuggestedTextStyleChange?: (style: { fill: string; stroke: string }) => void;
  backgroundImageSrc?: string;
}

/**
 * @description GlassCardComposite 的入参定义：组合 FrostedGlassCard 与内容层，并自动根据采样调整文字描边。
 * @param width 卡片宽度（默认 520）
 * @param height 卡片高度（默认 260）
 * @param theme 主题色板
 * @param title 标题文本
 * @param subtitle 副标题文本
 * @param imageSrc 底图 URL（透传到 FrostedGlassCard）
 * @param animate 是否启用动态磨砂效果（透传到 FrostedGlassCard）
 * @param blurPx 模糊半径（透传到 FrostedGlassCard）
 * @param glassAlpha 磨砂层不透明度（透传到 FrostedGlassCard）
 * @param windowRatio 默认窗口宽度占比（透传到 FrostedGlassCard）
 * @param windowRect 清晰窗口矩形（可选）
 * @returns GlassCardCompositeProps
 * @example
 * ```tsx
 * import { GlassCardComposite } from '@/demo/glass-card/widgets/glass-card';
 * import { Themes } from '@/styles/theme';
 *
 * <GlassCardComposite
 *   width={520}
 *   height={260}
 *   theme={Themes.light}
 *   title="示例标题"
 *   subtitle="示例副标题"
 *   windowRatio={0.32}
 * />;
 * ```
 */
export interface GlassCardCompositeProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
  title?: string;
  subtitle?: string;
  imageSrc?: string;
  animate?: boolean;
  blurPx?: number;
  glassAlpha?: number;
  windowRatio?: number;
  windowRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
  };
}
