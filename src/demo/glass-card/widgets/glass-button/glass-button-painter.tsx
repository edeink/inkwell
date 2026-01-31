import type { GlassButtonEffect, GlassButtonEffectName } from './effects';
import type { BoxConstraints, BuildContext, Size, WidgetProps } from '@/core';
import type { ThemePalette } from '@/styles/theme';

import { Widget } from '@/core';
import { applyAlpha } from '@/core/helper/color';
import { roundedRectPath } from '@/demo/glass-card/helpers/canvas';
import { Themes } from '@/styles/theme';

export type GlassButtonActiveVariant = Extract<
  GlassButtonEffectName,
  'rim' | 'wave' | 'rhythm' | 'prism' | 'cyberpunk' | 'frost'
>;

export interface GlassButtonPainterProps extends WidgetProps {
  theme?: ThemePalette;
  tint?: string;
  glyph?: string;
  activeVariant?: GlassButtonActiveVariant;
}

export type GlassButtonPainterFrameState = {
  theme: ThemePalette;
  tint: string;
  glyph: string;
  activeVariant: GlassButtonActiveVariant;
  activeT: number;
  hoverT: number;
  pressX: number;
  pressY: number;
  hoverX: number;
  hoverY: number;
  phase: number;
  effect: GlassButtonEffect;
};

type FilterSetter = (value: string | null) => boolean;

/**
 * @description 玻璃按钮绘制层：只负责 paintSelf，状态由外层按钮同步
 */
export class GlassButtonPainter extends Widget<GlassButtonPainterProps> {
  private theme?: ThemePalette;
  private tint: string = '#ffffff';
  private glyph: string = '';
  private activeVariant: GlassButtonActiveVariant = 'rim';

  private activeT: number = 0;
  private hoverT: number = 0;
  private pressX: number = 0;
  private pressY: number = 0;
  private hoverX: number = 0;
  private hoverY: number = 0;
  private phase: number = 0;

  private effect?: GlassButtonEffect;

  /**
   * @description 设置当前帧绘制状态（由外层按钮逐帧同步）
   * @param next {GlassButtonPainterFrameState} 下一帧状态
   * @returns {void}
   */
  setFrameState(next: GlassButtonPainterFrameState): void {
    this.theme = next.theme;
    this.tint = next.tint;
    this.glyph = next.glyph;
    this.activeVariant = next.activeVariant;
    this.activeT = next.activeT;
    this.hoverT = next.hoverT;
    this.pressX = next.pressX;
    this.pressY = next.pressY;
    this.hoverX = next.hoverX;
    this.hoverY = next.hoverY;
    this.phase = next.phase;
    this.effect = next.effect;
  }

  /**
   * @description 初始化绘制层：读取初始 props 并返回自身
   * @param data {GlassButtonPainterProps} 初始 props
   * @returns {Widget} 当前组件实例
   */
  createElement(data: GlassButtonPainterProps): Widget {
    super.createElement(data);
    this.theme = data.theme;
    if (typeof data.tint === 'string' && data.tint) {
      this.tint = data.tint;
    }
    if (typeof data.glyph === 'string') {
      this.glyph = data.glyph;
    }
    if (typeof data.activeVariant === 'string' && data.activeVariant) {
      this.activeVariant = data.activeVariant as GlassButtonActiveVariant;
    }
    return this;
  }

  /**
   * @description 执行布局：按父约束返回自身尺寸
   * @param constraints {BoxConstraints} 布局约束
   * @returns {Size} 布局尺寸
   */
  protected performLayout(constraints: BoxConstraints): Size {
    const maxW = Number.isFinite(constraints.maxWidth)
      ? constraints.maxWidth
      : constraints.minWidth;
    const maxH = Number.isFinite(constraints.maxHeight)
      ? constraints.maxHeight
      : constraints.minHeight;
    const width = Math.max(0, Number.isFinite(maxW) ? maxW : 0);
    const height = Math.max(0, Number.isFinite(maxH) ? maxH : 0);
    return { width, height };
  }

  /**
   * @description 绘制按钮：包含玻璃底、磨砂、边缘、特效与字形底座
   * @param context {BuildContext} 绘制上下文
   * @returns {void}
   */
  protected paintSelf(context: BuildContext): void {
    const renderer = context.renderer;
    const ctx = renderer.getRawInstance?.() as CanvasRenderingContext2D | null;
    const theme = this.theme ?? Themes.light;
    const { width, height } = this.renderObject.size;
    if (!ctx || width <= 0 || height <= 0) {
      renderer.drawRect({
        x: 0,
        y: 0,
        width,
        height,
        fill: theme.background.container,
        borderRadius: 18,
      });
      return;
    }

    const rawFilter = (ctx as unknown as { filter?: unknown }).filter;
    const setFilter: FilterSetter = (value) => {
      if (typeof rawFilter === 'string') {
        if (value === null) {
          (ctx as unknown as { filter: string }).filter = rawFilter;
        } else {
          (ctx as unknown as { filter: string }).filter = value;
        }
        return true;
      }
      return false;
    };

    const r = Math.min(height * 0.38, 26);
    const a = Math.max(0, Math.min(1, this.activeT));
    const t = a * a * (3 - 2 * a);
    const h = Math.max(0, Math.min(1, this.hoverT));
    const th = h * h * (3 - 2 * h);
    const hx = Math.max(0, Math.min(width, this.hoverX));
    const hy = Math.max(0, Math.min(height, this.hoverY));

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    this.paintBase(ctx, theme, width, height, r, t);

    ctx.save();
    ctx.beginPath();
    roundedRectPath(ctx, 0, 0, width, height, r);
    ctx.clip();

    this.paintFrosted(ctx, theme, width, height, setFilter);
    this.paintTintGlow(ctx, theme, width, height, setFilter, this.tint);
    this.paintEdge(ctx, theme, width, height, r, t, th, setFilter);
    this.paintEffects(ctx, theme, width, height, r, t, th, hx, hy, setFilter);
    this.paintTopHighlight(ctx, theme, width, height, t);
    this.paintSpecks(ctx, theme, width, height, setFilter);
    this.paintBorder(ctx, theme, width, height, r);

    ctx.restore();

    if (this.glyph) {
      this.paintGlyphTile(ctx, theme, height, t, setFilter);
    }

    ctx.restore();
  }

  /**
   * @description 绘制按钮基础玻璃底色与阴影
   */
  private paintBase(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    r: number,
    t: number,
  ): void {
    ctx.save();
    const baseShadowA = theme === Themes.dark ? 0.34 : 0.18;
    const baseShadowBlur = theme === Themes.dark ? 26 : 24;
    const baseShadowOffY = theme === Themes.dark ? 14 : 12;
    ctx.shadowColor = applyAlpha('#000000', baseShadowA * (1 - 0.35 * t));
    ctx.shadowBlur = baseShadowBlur * (1 - 0.45 * t);
    ctx.shadowOffsetY = baseShadowOffY * (1 - 0.55 * t);
    ctx.beginPath();
    roundedRectPath(ctx, 0, 0, width, height, r);
    const baseGrad = ctx.createLinearGradient(0, 0, width, height);
    if (theme === Themes.dark) {
      baseGrad.addColorStop(0, applyAlpha('#ffffff', 0.14 + 0.06 * t));
      baseGrad.addColorStop(0.55, applyAlpha('#ffffff', 0.06 + 0.05 * t));
      baseGrad.addColorStop(1, applyAlpha('#ffffff', 0.1 + 0.05 * t));
    } else {
      baseGrad.addColorStop(0, applyAlpha('#ffffff', 0.66 + 0.08 * t));
      baseGrad.addColorStop(0.55, applyAlpha('#ffffff', 0.32 + 0.1 * t));
      baseGrad.addColorStop(1, applyAlpha('#ffffff', 0.5 + 0.08 * t));
    }
    ctx.fillStyle = baseGrad;
    ctx.fill();
    ctx.restore();
  }

  /**
   * @description 绘制磨砂层（轻微 blur + 渐变覆盖）
   */
  private paintFrosted(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    setFilter: FilterSetter,
  ): void {
    const blurHadFilter = setFilter(`blur(${theme === Themes.dark ? 16 : 18}px)`);
    ctx.globalAlpha = theme === Themes.dark ? 0.62 : 0.46;
    const frosted = ctx.createLinearGradient(0, 0, width, height);
    frosted.addColorStop(0, applyAlpha('#ffffff', theme === Themes.dark ? 0.08 : 0.22));
    frosted.addColorStop(0.55, applyAlpha('#ffffff', 0));
    frosted.addColorStop(1, applyAlpha('#000000', theme === Themes.dark ? 0.26 : 0.14));
    ctx.fillStyle = frosted;
    ctx.fillRect(-18, -18, width + 36, height + 36);
    ctx.globalAlpha = 1;
    if (blurHadFilter) {
      setFilter(null);
    }
  }

  /**
   * @description 绘制 tint 光晕（用于强化按钮主色氛围）
   */
  private paintTintGlow(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    setFilter: FilterSetter,
    tint: string,
  ): void {
    ctx.save();
    const tintHadFilter = setFilter(`blur(${theme === Themes.dark ? 22 : 24}px)`);
    ctx.globalAlpha = theme === Themes.dark ? 0.34 : 0.26;
    const tintGlow = ctx.createRadialGradient(
      width * 0.28,
      height * 0.34,
      0,
      width * 0.28,
      height * 0.34,
      Math.max(width, height) * 0.85,
    );
    tintGlow.addColorStop(0, applyAlpha(tint, 0.7));
    tintGlow.addColorStop(1, applyAlpha(tint, 0));
    ctx.fillStyle = tintGlow;
    ctx.fillRect(-20, -20, width + 40, height + 40);
    ctx.globalAlpha = 1;
    if (tintHadFilter) {
      setFilter(null);
    }
    ctx.restore();
  }

  /**
   * @description 绘制边缘高光（hover/active 时增强）
   */
  private paintEdge(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    r: number,
    t: number,
    th: number,
    setFilter: FilterSetter,
  ): void {
    const edgeT = Math.max(t, th * 0.52);
    if (edgeT <= 0.001) {
      return;
    }
    const edgeHadFilter = setFilter(`blur(${theme === Themes.dark ? 8 : 9}px)`);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = (theme === Themes.dark ? 0.12 : 0.14) * edgeT * (1 - 0.12 * t);
    ctx.lineWidth = 2;
    const edge = ctx.createLinearGradient(0, 0, width, height);
    edge.addColorStop(0, applyAlpha('#ffffff', 0.9));
    edge.addColorStop(0.38, applyAlpha('#ffffff', 0.24));
    edge.addColorStop(1, applyAlpha('#ffffff', 0));
    ctx.strokeStyle = edge;
    ctx.beginPath();
    roundedRectPath(ctx, 1, 1, width - 2, height - 2, Math.max(1, r - 1));
    ctx.stroke();
    ctx.restore();
    if (edgeHadFilter) {
      setFilter(null);
    }
  }

  /**
   * @description 绘制当前特效（按 hover/active 组合成管线分步绘制）
   */
  private paintEffects(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    r: number,
    t: number,
    th: number,
    hx: number,
    hy: number,
    setFilter: FilterSetter,
  ): void {
    const fx = this.effect;
    if (!fx) {
      return;
    }
    const hoverEffectT = th * 0.68 * (1 - 0.22 * t);
    const common = {
      ctx,
      theme,
      width,
      height,
      radius: r,
      tint: this.tint,
      phase: this.phase,
      setFilter,
      activeT: t,
      hoverT: th,
    };
    const fxPipeline: Array<{ strength: number; x: number; y: number }> = [];
    if (this.activeVariant === 'rhythm') {
      const ax = Math.max(0, Math.min(width, this.pressX));
      const ay = Math.max(0, Math.min(height, this.pressY));
      const usePress = t > hoverEffectT * 0.6;
      fxPipeline.push({
        strength: Math.max(hoverEffectT, t),
        x: usePress ? ax : hx,
        y: usePress ? ay : hy,
      });
    } else {
      if (hoverEffectT > 0.001) {
        fxPipeline.push({ strength: hoverEffectT, x: hx, y: hy });
      }
      if (t > 0.001) {
        fxPipeline.push({
          strength: t,
          x: Math.max(0, Math.min(width, this.pressX)),
          y: Math.max(0, Math.min(height, this.pressY)),
        });
      }
    }
    for (const step of fxPipeline) {
      fx.paint({ ...common, ...step });
    }
  }

  /**
   * @description 绘制顶部高光层（增强玻璃折射感）
   */
  private paintTopHighlight(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    t: number,
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const hi = ctx.createLinearGradient(0, 0, width, height);
    hi.addColorStop(0, applyAlpha('#ffffff', (theme === Themes.dark ? 0.24 : 0.38) + 0.12 * t));
    hi.addColorStop(0.42, applyAlpha('#ffffff', 0.08 + 0.08 * t));
    hi.addColorStop(1, applyAlpha('#ffffff', 0));
    ctx.fillStyle = hi;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * @description 绘制细小光斑颗粒（弱 blur 的高光点）
   */
  private paintSpecks(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    setFilter: FilterSetter,
  ): void {
    const speckHadFilter = setFilter(`blur(${theme === Themes.dark ? 10 : 12}px)`);
    ctx.globalAlpha = theme === Themes.dark ? 0.22 : 0.2;
    for (let i = 0; i < 4; i++) {
      const px = width * (0.24 + i * 0.18);
      const py = height * (0.35 + (i % 2) * 0.22);
      const pr = height * (0.72 + (i % 3) * 0.14);
      const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
      pg.addColorStop(0, applyAlpha('#ffffff', 0.22));
      pg.addColorStop(1, applyAlpha('#ffffff', 0));
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (speckHadFilter) {
      setFilter(null);
    }
  }

  /**
   * @description 绘制按钮描边（亮边 + 暗边叠加）
   */
  private paintBorder(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    width: number,
    height: number,
    r: number,
  ): void {
    ctx.strokeStyle = applyAlpha('#ffffff', theme === Themes.dark ? 0.18 : 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundedRectPath(ctx, 0.5, 0.5, width - 1, height - 1, Math.max(1, r - 0.5));
    ctx.stroke();
    ctx.strokeStyle = applyAlpha('#000000', theme === Themes.dark ? 0.4 : 0.12);
    ctx.beginPath();
    roundedRectPath(ctx, 0.5, 0.5, width - 1, height - 1, Math.max(1, r - 0.5));
    ctx.stroke();
  }

  /**
   * @description 绘制字形底座（小玻璃砖 + tint 光晕）
   */
  private paintGlyphTile(
    ctx: CanvasRenderingContext2D,
    theme: ThemePalette,
    height: number,
    t: number,
    setFilter: FilterSetter,
  ): void {
    const pad = Math.max(14, height * 0.2);
    const tileSize = Math.min(height - pad, height * 0.72);
    const tileX = pad * 0.92;
    const tileY = (height - tileSize) / 2;
    const tileR = Math.min(tileSize * 0.28, 18);

    ctx.save();
    ctx.shadowColor = applyAlpha('#000000', (theme === Themes.dark ? 0.38 : 0.16) * (1 - 0.35 * t));
    ctx.shadowBlur = (theme === Themes.dark ? 18 : 16) * (1 - 0.45 * t);
    ctx.shadowOffsetY = (theme === Themes.dark ? 10 : 8) * (1 - 0.55 * t);
    ctx.beginPath();
    roundedRectPath(ctx, tileX, tileY, tileSize, tileSize, tileR);
    const tileBase = ctx.createLinearGradient(tileX, tileY, tileX + tileSize, tileY + tileSize);
    tileBase.addColorStop(
      0,
      applyAlpha('#ffffff', (theme === Themes.dark ? 0.12 : 0.52) + 0.08 * t),
    );
    tileBase.addColorStop(
      0.6,
      applyAlpha('#ffffff', (theme === Themes.dark ? 0.06 : 0.28) + 0.06 * t),
    );
    tileBase.addColorStop(
      1,
      applyAlpha('#ffffff', (theme === Themes.dark ? 0.08 : 0.36) + 0.07 * t),
    );
    ctx.fillStyle = tileBase;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    roundedRectPath(ctx, tileX, tileY, tileSize, tileSize, tileR);
    ctx.clip();
    const tileTintHadFilter = setFilter(`blur(${theme === Themes.dark ? 16 : 18}px)`);
    ctx.globalAlpha = theme === Themes.dark ? 0.52 : 0.42;
    const tileGlow = ctx.createRadialGradient(
      tileX + tileSize * 0.3,
      tileY + tileSize * 0.3,
      0,
      tileX + tileSize * 0.3,
      tileY + tileSize * 0.3,
      tileSize * 1.1,
    );
    tileGlow.addColorStop(0, applyAlpha(this.tint, 0.9));
    tileGlow.addColorStop(1, applyAlpha(this.tint, 0));
    ctx.fillStyle = tileGlow;
    ctx.fillRect(tileX - 10, tileY - 10, tileSize + 20, tileSize + 20);
    ctx.globalAlpha = 1;
    if (tileTintHadFilter) {
      setFilter(null);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const tileHi = ctx.createLinearGradient(tileX, tileY, tileX + tileSize, tileY + tileSize);
    tileHi.addColorStop(0, applyAlpha('#ffffff', theme === Themes.dark ? 0.34 : 0.48));
    tileHi.addColorStop(0.48, applyAlpha('#ffffff', 0.12));
    tileHi.addColorStop(1, applyAlpha('#ffffff', 0));
    ctx.fillStyle = tileHi;
    ctx.fillRect(tileX, tileY, tileSize, tileSize);
    ctx.restore();

    ctx.restore();
  }
}
