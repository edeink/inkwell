import { applyAlpha } from './effects/apply-alpha';
import { clamp01 } from './effects/math';
import { clipRoundedRect, paintCardBase, paintCardGlare } from './effects/paint-card';
import { paintCenterDisk } from './effects/paint-disk';
import {
  clipAnnulus,
  paintGrooveAO,
  paintGrooveBase,
  paintGrooveDepth,
  paintGrooveStructureLines,
} from './effects/paint-groove';
import {
  paintProgressAtmosphere,
  paintProgressFallback,
  paintProgressOnScratch,
} from './effects/paint-progress';
import { GlassChartProgressRingStyle } from './glass-chart-types';

import type { ScratchCache } from './effects/scratch-canvas';

import { Widget, type BoxConstraints, type Size, type WidgetProps } from '@/core';
import { Themes, type ThemePalette } from '@/styles/theme';

/**
 * GlassChart 的绘制基础层：
 * - 负责尺寸约束与通用几何参数计算
 * - 负责背景、网格、进度环等公共分层绘制编排
 * - 具体的绘制细节下沉到 effects/ 目录，避免单文件过大
 */
export { applyAlpha } from './effects/apply-alpha';
export { readCanvasFilter, setCanvasFilter } from './effects/canvas-filter';
export { ensureScratchCanvas, type ScratchCache } from './effects/scratch-canvas';
export {
  GlassChartProgressRingStyle,
  type GlassChartProgressRingProps,
  type GlassChartSlotProps,
} from './glass-chart-types';

type GlassChartFallbackRectRenderer = {
  drawRect: (input: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    borderRadius: number;
  }) => void;
};

/**
 * GlassChart 渲染层的基础类。
 * 子类只需要在 paintSelf 里调用这些分层方法即可复用同一套造型逻辑。
 */
export abstract class GlassChartLayerBase<
  P extends WidgetProps & { theme: ThemePalette },
> extends Widget<P> {
  /**
   * 该 demo 的 Widget 是固定尺寸场景：尽量收敛约束，给出可用的默认最大值。
   */
  protected performLayout(constraints: BoxConstraints): Size {
    const maxW = Number.isFinite(constraints.maxWidth) ? constraints.maxWidth : 420;
    const maxH = Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : 520;
    const minW = Number.isFinite(constraints.minWidth) ? constraints.minWidth : 0;
    const minH = Number.isFinite(constraints.minHeight) ? constraints.minHeight : 0;
    const width = Math.max(minW, Math.min(maxW, constraints.maxWidth));
    const height = Math.max(minH, Math.min(maxH, constraints.maxHeight));
    return { width, height };
  }

  /**
   * demo 交互（例如按钮切换风格/进度）会更新 props，直接触发重绘即可。
   */
  protected didUpdateWidget(): void {
    this.markNeedsPaint();
  }

  /**
   * 当没有 Canvas2D 上下文时，退化为 Renderer 的矩形绘制，保证页面可见。
   */
  protected paintFallbackRect(
    renderer: GlassChartFallbackRectRenderer,
    theme: ThemePalette,
    width: number,
    height: number,
  ): void {
    renderer.drawRect({
      x: 0,
      y: 0,
      width,
      height,
      fill: theme.background.container,
      borderRadius: 24,
    });
  }

  protected computePaintParams(
    theme: ThemePalette,
    width: number,
    height: number,
    progress: number,
  ): {
    r: number;
    bg: string;
    border: string;
    cx: number;
    cy: number;
    ringR: number;
    ringW: number;
    tau: number;
    startA: number;
    p: number;
    outerR: number;
    innerR: number;
    diskR: number;
  } {
    const r = Math.min(28, Math.min(width, height) * 0.08);
    const bg = theme === Themes.dark ? '#171a20' : '#ffffff';
    const border = applyAlpha(theme.text.primary, theme === Themes.dark ? 0.18 : 0.08);
    const cx = width / 2;
    const cy = height * 0.49;
    const ringR = Math.min(width, height) * 0.335;
    const ringW = Math.max(22, Math.min(44, ringR * 0.32));
    const tau = Math.PI * 2;
    const startA = -Math.PI / 2;
    const p = clamp01(progress);
    const outerR = ringR + ringW * 0.5;
    const innerR = Math.max(1, ringR - ringW * 0.5);
    const diskR = Math.max(1, innerR - Math.max(10, ringW * 0.2));
    return { r, bg, border, cx, cy, ringR, ringW, tau, startA, p, outerR, innerR, diskR };
  }

  /**
   * 背景层：玻璃卡片底 + 反光 + 中心圆盘。
   */
  protected paintBackgroundLayer(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    r: number,
    bg: string,
    border: string,
    rawFilter: unknown,
    cx: number,
    cy: number,
    diskR: number,
    ringW: number,
    tau: number,
  ): void {
    ctx.save();
    paintCardBase(ctx, theme, width, height, r, bg, border);
    ctx.save();
    clipRoundedRect(ctx, width, height, r);
    paintCardGlare(ctx, theme, width, height);
    paintCenterDisk(ctx, theme, rawFilter, cx, cy, diskR, ringW, tau);
    ctx.restore();
    ctx.restore();
  }

  /**
   * 网格层：进度槽的底色、立体感与结构线。
   */
  protected paintGridLayer(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    rawFilter: unknown,
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    ringW: number,
    tau: number,
  ): void {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.save();
    clipAnnulus(ctx, cx, cy, innerR, outerR, tau);
    paintGrooveBase(ctx, theme, cx, cy, innerR, outerR, width, height);
    paintGrooveDepth(ctx, theme, rawFilter, cx, cy, outerR, width, height);
    paintGrooveAO(ctx, theme, rawFilter, cx, cy, innerR, ringW, tau);
    paintGrooveStructureLines(ctx, theme, cx, cy, innerR, outerR, tau);
    ctx.restore();
    ctx.restore();
  }

  /**
   * 数据层：进度环主体。
   * 风格差异通过 styleType 下沉到这里（以及 effects/ 的渐变/纹理策略），避免后置滤镜叠加。
   */
  protected paintDataLineLayer(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    rawFilter: unknown,
    scratch: ScratchCache | undefined,
    cx: number,
    cy: number,
    ringR: number,
    ringW: number,
    innerR: number,
    outerR: number,
    tau: number,
    startA: number,
    p: number,
  ): void {
    if (p <= 0) {
      return;
    }
    const endA = startA + tau * p;
    const jellyW = Math.max(16, Math.min(ringW - 1, ringW * 0.98));
    const feather = Math.max(10, jellyW * 0.75);
    paintProgressAtmosphere(ctx, theme, rawFilter, cx, cy, ringR, ringW, jellyW, startA, endA);
    if (scratch) {
      paintProgressOnScratch(
        scratch.ctx,
        theme,
        cx,
        cy,
        ringR,
        innerR,
        outerR,
        jellyW,
        feather,
        tau,
        startA,
        endA,
        width,
        height,
      );
      ctx.drawImage(scratch.canvas as unknown as CanvasImageSource, 0, 0);
    } else {
      paintProgressFallback(ctx, theme, cx, cy, ringR, jellyW, startA, endA);
    }
  }

  /**
   * 交互层：预留接口，当前 demo 不需要额外绘制。
   */
  protected paintInteractionLayer(
    _ctx: CanvasRenderingContext2D,
    _theme: ThemePalette,
    _width: number,
    _height: number,
    _cx: number,
    _cy: number,
  ): void {}
}
