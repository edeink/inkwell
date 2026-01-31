/**
 * @file 玻璃按钮特效：棱镜折射（Prism）
 * @author @trae
 * @since 0.0.0
 */
import { createPausableEffect } from './effect-types';

import type {
  GlassButtonEffect,
  GlassButtonEffectPaintContext,
  GlassButtonEffectRuntimeContext,
} from './effect-types';

import { applyAlpha } from '@/core/helper/color';
import { roundedRectPath } from '@/demo/glass-card/helpers/canvas';
import { Themes } from '@/styles/theme';

/**
 * @description Prism 特效配置
 */
export interface GlassButtonPrismEffectConfig {
  /** 轮廓模糊半径（暗色主题） */
  outlineBlurDark: number;
  /** 轮廓模糊半径（亮色主题） */
  outlineBlurLight: number;
  /** 光带模糊半径（暗色主题） */
  bandBlurDark: number;
  /** 光带模糊半径（亮色主题） */
  bandBlurLight: number;
}

function resolvePrismConfig(
  prev: GlassButtonPrismEffectConfig,
  next: Partial<GlassButtonPrismEffectConfig>,
): GlassButtonPrismEffectConfig {
  const cfg: GlassButtonPrismEffectConfig = { ...prev };
  const setNum = (key: keyof GlassButtonPrismEffectConfig, min: number, max: number) => {
    const v = next[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      (cfg as unknown as Record<string, number>)[key as string] = Math.max(min, Math.min(max, v));
    }
  };
  setNum('outlineBlurDark', 0, 60);
  setNum('outlineBlurLight', 0, 60);
  setNum('bandBlurDark', 0, 60);
  setNum('bandBlurLight', 0, 60);
  return cfg;
}

/**
 * @description 创建 Prism 特效
 * @param config {Partial<GlassButtonPrismEffectConfig>} 配置
 * @returns {GlassButtonEffect} 特效实例
 */
export function createPrismEffect(
  config?: Partial<GlassButtonPrismEffectConfig>,
): GlassButtonEffect {
  const base: GlassButtonPrismEffectConfig = {
    outlineBlurDark: 2.2,
    outlineBlurLight: 2.6,
    bandBlurDark: 10,
    bandBlurLight: 12,
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const asObj = (v: unknown) =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;

  let cfgHover = resolvePrismConfig(base, config ?? {});
  let cfgActive = cfgHover;
  const cfg = { ...cfgHover };
  let lastExternalConfig: unknown = undefined;

  const applyBlendedConfig = (activeT: number) => {
    const t = clamp01(activeT);
    cfg.outlineBlurDark = lerp(cfgHover.outlineBlurDark, cfgActive.outlineBlurDark, t);
    cfg.outlineBlurLight = lerp(cfgHover.outlineBlurLight, cfgActive.outlineBlurLight, t);
    cfg.bandBlurDark = lerp(cfgHover.bandBlurDark, cfgActive.bandBlurDark, t);
    cfg.bandBlurLight = lerp(cfgHover.bandBlurLight, cfgActive.bandBlurLight, t);
  };

  const applyExternalConfig = (external: unknown) => {
    const obj = asObj(external);
    const hover = asObj(obj?.hover);
    const active = asObj(obj?.active);
    if (hover || active) {
      cfgHover = resolvePrismConfig(base, (hover ?? {}) as Partial<GlassButtonPrismEffectConfig>);
      cfgActive = resolvePrismConfig(base, (active ?? {}) as Partial<GlassButtonPrismEffectConfig>);
    } else {
      cfgHover = resolvePrismConfig(base, (obj ?? {}) as Partial<GlassButtonPrismEffectConfig>);
      cfgActive = cfgHover;
    }
  };

  const impl: Omit<GlassButtonEffect, 'name' | 'pause' | 'resume'> = {
    update(_dt: number, ctx: GlassButtonEffectRuntimeContext) {
      const nextCfg = ctx.config;
      if (nextCfg !== lastExternalConfig) {
        lastExternalConfig = nextCfg;
        applyExternalConfig(nextCfg);
      }
      applyBlendedConfig(ctx.activeT);
    },
    paint(p: GlassButtonEffectPaintContext) {
      const t = p.strength;
      if (t <= 0.001) {
        return;
      }

      const d = Math.max(1.1, Math.min(3.6, p.height * 0.052)) * t; // 以按钮高度为基准缩放偏移
      const outlineBlur = p.theme === Themes.dark ? cfg.outlineBlurDark : cfg.outlineBlurLight;
      const prismHadFilter = p.setFilter(`blur(${outlineBlur}px)`);
      p.ctx.save();
      p.ctx.globalCompositeOperation = 'screen';
      p.ctx.lineWidth = 2.2;
      p.ctx.globalAlpha = (p.theme === Themes.dark ? 0.34 : 0.28) * t;

      p.ctx.strokeStyle = applyAlpha('#64e6ff', 1);
      p.ctx.beginPath();
      roundedRectPath(
        p.ctx,
        0.5 - d,
        0.5 - d * 0.55,
        p.width - 1,
        p.height - 1,
        Math.max(1, p.radius - 0.5),
      );
      p.ctx.stroke();

      p.ctx.strokeStyle = applyAlpha('#ff4bd9', 1);
      p.ctx.beginPath();
      roundedRectPath(
        p.ctx,
        0.5 + d,
        0.5 + d * 0.6,
        p.width - 1,
        p.height - 1,
        Math.max(1, p.radius - 0.5),
      );
      p.ctx.stroke();

      p.ctx.strokeStyle = applyAlpha('#ffe56a', 1);
      p.ctx.beginPath();
      roundedRectPath(
        p.ctx,
        0.5 + d * 0.15,
        0.5 - d * 0.85,
        p.width - 1,
        p.height - 1,
        Math.max(1, p.radius - 0.5),
      );
      p.ctx.stroke();

      p.ctx.restore();
      if (prismHadFilter) {
        p.setFilter(null);
      }

      p.ctx.save();
      p.ctx.globalCompositeOperation = 'screen';
      p.ctx.globalAlpha = (p.theme === Themes.dark ? 0.26 : 0.2) * t;
      p.ctx.beginPath();
      roundedRectPath(p.ctx, 0, 0, p.width, p.height, p.radius);
      p.ctx.clip();
      const bandShift = (p.phase * 0.55) % 1;
      const bx = -p.width * 0.6 + p.width * 2.1 * bandShift;
      const spectrum = p.ctx.createLinearGradient(
        bx,
        -p.height * 0.2,
        bx + p.width * 1.1,
        p.height * 1.2,
      );
      spectrum.addColorStop(0, applyAlpha('#64e6ff', 0));
      spectrum.addColorStop(0.32, applyAlpha('#64e6ff', 0.18));
      spectrum.addColorStop(0.46, applyAlpha('#ff4bd9', 0.18));
      spectrum.addColorStop(0.6, applyAlpha('#ffe56a', 0.16));
      spectrum.addColorStop(1, applyAlpha('#ffe56a', 0));
      const bandBlur = p.theme === Themes.dark ? cfg.bandBlurDark : cfg.bandBlurLight;
      const bandHadFilter = p.setFilter(`blur(${bandBlur}px)`);
      p.ctx.fillStyle = spectrum;
      p.ctx.fillRect(0, 0, p.width, p.height);
      if (bandHadFilter) {
        p.setFilter(null);
      }
      p.ctx.restore();
    },
    dispose() {
      lastExternalConfig = undefined;
    },
  };

  return createPausableEffect('prism', impl);
}
