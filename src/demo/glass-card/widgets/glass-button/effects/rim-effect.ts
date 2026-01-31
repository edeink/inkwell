/**
 * @file 玻璃按钮特效：边缘光晕（Rim）
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
 * @description Rim 特效配置
 */
export interface GlassButtonRimEffectConfig {
  /** 外圈带宽（像素） */
  bandWidth: number;
  /** 模糊半径（暗色主题） */
  blurDark: number;
  /** 模糊半径（亮色主题） */
  blurLight: number;
}

function resolveRimConfig(
  prev: GlassButtonRimEffectConfig,
  next: Partial<GlassButtonRimEffectConfig>,
): GlassButtonRimEffectConfig {
  const cfg: GlassButtonRimEffectConfig = { ...prev };
  const setNum = (key: keyof GlassButtonRimEffectConfig, min: number, max: number) => {
    const v = next[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      (cfg as unknown as Record<string, number>)[key as string] = Math.max(min, Math.min(max, v));
    }
  };
  setNum('bandWidth', 2, 24);
  setNum('blurDark', 0, 200);
  setNum('blurLight', 0, 200);
  return cfg;
}

/**
 * @description 创建 Rim 特效
 * @param config {Partial<GlassButtonRimEffectConfig>} 配置
 * @returns {GlassButtonEffect} 特效实例
 */
export function createRimEffect(config?: Partial<GlassButtonRimEffectConfig>): GlassButtonEffect {
  const base: GlassButtonRimEffectConfig = {
    bandWidth: 8,
    blurDark: 7,
    blurLight: 8,
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const asObj = (v: unknown) =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;

  let cfgHover = resolveRimConfig(base, config ?? {});
  let cfgActive = cfgHover;
  const cfg = { ...cfgHover };
  let lastExternalConfig: unknown = undefined;

  const applyBlendedConfig = (activeT: number) => {
    const t = clamp01(activeT);
    cfg.bandWidth = lerp(cfgHover.bandWidth, cfgActive.bandWidth, t);
    cfg.blurDark = lerp(cfgHover.blurDark, cfgActive.blurDark, t);
    cfg.blurLight = lerp(cfgHover.blurLight, cfgActive.blurLight, t);
  };

  const applyExternalConfig = (external: unknown) => {
    const obj = asObj(external);
    const hover = asObj(obj?.hover);
    const active = asObj(obj?.active);
    if (hover || active) {
      cfgHover = resolveRimConfig(base, (hover ?? {}) as Partial<GlassButtonRimEffectConfig>);
      cfgActive = resolveRimConfig(base, (active ?? {}) as Partial<GlassButtonRimEffectConfig>);
    } else {
      cfgHover = resolveRimConfig(base, (obj ?? {}) as Partial<GlassButtonRimEffectConfig>);
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

      const band = Math.max(2, Math.min(12, cfg.bandWidth));
      const shift = (p.phase * 0.9) % 1;
      const x0 = -p.width * 1.1 + p.width * 2.4 * shift;
      const rim = p.ctx.createLinearGradient(
        x0,
        -p.height * 0.2,
        x0 + p.width * 1.2,
        p.height * 1.3,
      );
      rim.addColorStop(0, applyAlpha('#ffffff', 0));
      rim.addColorStop(0.42, applyAlpha('#ffffff', (p.theme === Themes.dark ? 0.52 : 0.62) * t));
      rim.addColorStop(0.5, applyAlpha(p.tint, (p.theme === Themes.dark ? 0.22 : 0.18) * t));
      rim.addColorStop(0.58, applyAlpha('#ffffff', (p.theme === Themes.dark ? 0.26 : 0.3) * t));
      rim.addColorStop(1, applyAlpha('#ffffff', 0));

      const blur = p.theme === Themes.dark ? cfg.blurDark : cfg.blurLight;
      const rimHadFilter = p.setFilter(`blur(${blur}px)`);
      p.ctx.save();
      p.ctx.globalCompositeOperation = 'screen';
      p.ctx.fillStyle = rim;
      p.ctx.beginPath();
      roundedRectPath(p.ctx, 0, 0, p.width, p.height, p.radius);
      roundedRectPath(
        p.ctx,
        band,
        band,
        p.width - band * 2,
        p.height - band * 2,
        Math.max(0, p.radius - band),
      );
      p.ctx.fill('evenodd');
      if (rimHadFilter) {
        p.setFilter(null);
      }
      p.ctx.restore();

      p.ctx.save();
      p.ctx.globalCompositeOperation = 'screen';
      p.ctx.globalAlpha = (p.theme === Themes.dark ? 0.22 : 0.18) * t;
      p.ctx.lineWidth = 1.5;
      p.ctx.strokeStyle = applyAlpha(p.tint, 0.9);
      p.ctx.beginPath();
      roundedRectPath(
        p.ctx,
        0.75,
        0.75,
        p.width - 1.5,
        p.height - 1.5,
        Math.max(1, p.radius - 0.75),
      );
      p.ctx.stroke();
      p.ctx.restore();
    },
    dispose() {
      lastExternalConfig = undefined;
    },
  };

  return createPausableEffect('rim', impl);
}
