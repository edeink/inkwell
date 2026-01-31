import {
  GlassChartLayerBase,
  ensureScratchCanvas,
  readCanvasFilter,
  type GlassChartProgressRingProps,
  type ScratchCache,
} from './glass-chart-layer-base';

import type { BuildContext } from '@/core';

import { Themes } from '@/styles/theme';

/**
 * 进度环绘制层：
 * - 只负责组织参数与调用基础层的分层绘制方法
 * - 风格差异通过 styleType 传入，具体表现由 effects/ 决定
 */
export class GlassChartProgressRing extends GlassChartLayerBase<GlassChartProgressRingProps> {
  /**
   * 复用离屏/临时画布，避免每帧重复分配，降低 GC 抖动。
   */
  private scratch?: ScratchCache;

  protected paintSelf(context: BuildContext): void {
    const renderer = context.renderer;
    const ctx = renderer.getRawInstance?.() as CanvasRenderingContext2D | null;
    const theme = this.data.theme ?? Themes.light;
    const { width, height } = this.renderObject.size;
    if (!ctx || width <= 0 || height <= 0) {
      return;
    }

    const rawFilter = readCanvasFilter(ctx);
    const { cx, cy, ringR, ringW, tau, startA, p, outerR, innerR } = this.computePaintParams(
      theme,
      width,
      height,
      this.data.progress,
    );
    if (p <= 0) {
      return;
    }

    this.scratch = ensureScratchCanvas(this.scratch, ctx.canvas, width, height) ?? this.scratch;
    this.paintDataLineLayer(
      ctx,
      theme,
      width,
      height,
      rawFilter,
      this.scratch,
      cx,
      cy,
      ringR,
      ringW,
      innerR,
      outerR,
      tau,
      startA,
      p,
    );
  }
}
