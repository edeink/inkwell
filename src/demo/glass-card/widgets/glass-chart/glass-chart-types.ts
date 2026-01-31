import type { WidgetProps } from '@/core';
import type { ThemePalette } from '@/styles/theme';

/**
 * 进度环风格枚举：
 * - 只要求形状一致，视觉表现允许差异
 * - 具体表现由进度环绘制逻辑根据该值选择不同渐变/纹理策略
 */
export enum GlassChartProgressRingStyle {
  Jelly = 'jelly',
}

/**
 * 槽位层 props。
 */
export interface GlassChartSlotProps extends WidgetProps {
  theme: ThemePalette;
}

/**
 * 进度环 props。
 */
export interface GlassChartProgressRingProps extends WidgetProps {
  progress: number;
  theme: ThemePalette;
}
