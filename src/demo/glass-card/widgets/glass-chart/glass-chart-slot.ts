import {
  GlassChartLayerBase,
  readCanvasFilter,
  type GlassChartSlotProps,
} from './glass-chart-layer-base';

import type { BuildContext } from '@/core';

import { Themes } from '@/styles/theme';

/**
 * 槽位层（底层容器）：
 * - 绘制玻璃卡片背景、中心圆盘、进度槽网格结构
 * - 不包含进度本体（由 GlassChartProgressRing 绘制）
 */
export class GlassChartSlot extends GlassChartLayerBase<GlassChartSlotProps> {
  protected paintSelf(context: BuildContext): void {
    const renderer = context.renderer;
    const ctx = renderer.getRawInstance?.() as CanvasRenderingContext2D | null;
    const theme = this.data.theme ?? Themes.light;
    const { width, height } = this.renderObject.size;
    if (!ctx || width <= 0 || height <= 0) {
      this.paintFallbackRect(renderer, theme, width, height);
      return;
    }

    const rawFilter = readCanvasFilter(ctx);
    const { r, bg, border, cx, cy, ringW, tau, outerR, innerR, diskR } = this.computePaintParams(
      theme,
      width,
      height,
      0,
    );
    this.paintBackgroundLayer(
      ctx,
      theme,
      width,
      height,
      r,
      bg,
      border,
      rawFilter,
      cx,
      cy,
      diskR,
      ringW,
      tau,
    );
    this.paintGridLayer(ctx, theme, width, height, rawFilter, cx, cy, innerR, outerR, ringW, tau);
    this.paintInteractionLayer(ctx, theme, width, height, cx, cy);
  }
}
