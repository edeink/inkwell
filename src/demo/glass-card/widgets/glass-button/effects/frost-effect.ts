/**
 * @file 玻璃按钮特效：霜冻凝结（Frost）
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
import { Themes } from '@/styles/theme';

/**
 * @description Frost 特效配置
 */
export interface GlassButtonFrostEffectConfig {
  /** 冰晶数量 */
  crystalCount: number;
  /** 冰晶最大半径（像素） */
  maxCrystalRadius: number;
  /** 边缘霜冻强度（0..1） */
  edgeStrength: number;
  /** 模糊半径（暗色主题） */
  blurDark: number;
  /** 模糊半径（亮色主题） */
  blurLight: number;
}

function resolveFrostConfig(
  prev: GlassButtonFrostEffectConfig,
  next: Partial<GlassButtonFrostEffectConfig>,
): GlassButtonFrostEffectConfig {
  const cfg: GlassButtonFrostEffectConfig = { ...prev };
  const setNum = (key: keyof GlassButtonFrostEffectConfig, min: number, max: number) => {
    const v = next[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      (cfg as unknown as Record<string, number>)[key as string] = Math.max(min, Math.min(max, v));
    }
  };
  setNum('crystalCount', 6, 80);
  setNum('maxCrystalRadius', 6, 34);
  setNum('edgeStrength', 0, 1);
  setNum('blurDark', 0, 60);
  setNum('blurLight', 0, 60);
  cfg.crystalCount = Math.round(cfg.crystalCount);
  return cfg;
}

interface FrostState {
  seedKey: string;
  xs: Float32Array;
  ys: Float32Array;
  rs: Float32Array;
  ws: Float32Array;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand01(state: { v: number }): number {
  let x = state.v;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.v = x >>> 0;
  return (state.v >>> 0) / 4294967295;
}

function createFrostState(seed: string, count: number): FrostState {
  const n = Math.max(6, Math.min(80, Math.round(count)));
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const rs = new Float32Array(n);
  const ws = new Float32Array(n);

  const s = { v: hashSeed(seed) ^ 0x9e3779b9 };
  for (let i = 0; i < n; i++) {
    const edge = rand01(s);
    const t = rand01(s);
    const inset = 0.06 + 0.22 * rand01(s);

    if (edge < 0.25) {
      xs[i] = t;
      ys[i] = inset;
    } else if (edge < 0.5) {
      xs[i] = 1 - inset;
      ys[i] = t;
    } else if (edge < 0.75) {
      xs[i] = 1 - t;
      ys[i] = 1 - inset;
    } else {
      xs[i] = inset;
      ys[i] = 1 - t;
    }

    rs[i] = 0.3 + 0.7 * rand01(s);
    ws[i] = 0.5 + 0.5 * rand01(s);
  }

  return { seedKey: seed, xs, ys, rs, ws };
}

/**
 * @description 创建 Frost 特效
 * @param config {Partial<GlassButtonFrostEffectConfig>} 配置
 * @returns {GlassButtonEffect} 特效实例
 */
export function createFrostEffect(
  config?: Partial<GlassButtonFrostEffectConfig>,
): GlassButtonEffect {
  const base: GlassButtonFrostEffectConfig = {
    crystalCount: 22,
    maxCrystalRadius: 16,
    edgeStrength: 0.8,
    blurDark: 10,
    blurLight: 12,
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const asObj = (v: unknown) =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;

  let cfgHover = resolveFrostConfig(base, config ?? {});
  let cfgActive = cfgHover;
  const cfg = { ...cfgHover };
  let lastExternalConfig: unknown = undefined;

  const applyBlendedConfig = (activeT: number) => {
    const t = clamp01(activeT);
    cfg.crystalCount = Math.round(t >= 0.5 ? cfgActive.crystalCount : cfgHover.crystalCount);
    cfg.maxCrystalRadius = lerp(cfgHover.maxCrystalRadius, cfgActive.maxCrystalRadius, t);
    cfg.edgeStrength = lerp(cfgHover.edgeStrength, cfgActive.edgeStrength, t);
    cfg.blurDark = lerp(cfgHover.blurDark, cfgActive.blurDark, t);
    cfg.blurLight = lerp(cfgHover.blurLight, cfgActive.blurLight, t);
  };

  const applyExternalConfig = (external: unknown) => {
    const obj = asObj(external);
    const hover = asObj(obj?.hover);
    const active = asObj(obj?.active);
    if (hover || active) {
      cfgHover = resolveFrostConfig(base, (hover ?? {}) as Partial<GlassButtonFrostEffectConfig>);
      cfgActive = resolveFrostConfig(base, (active ?? {}) as Partial<GlassButtonFrostEffectConfig>);
    } else {
      cfgHover = resolveFrostConfig(base, (obj ?? {}) as Partial<GlassButtonFrostEffectConfig>);
      cfgActive = cfgHover;
    }
    state = undefined;
  };

  let state: FrostState | undefined;

  const impl: Omit<GlassButtonEffect, 'name' | 'pause' | 'resume'> = {
    update(_dt: number, ctx: GlassButtonEffectRuntimeContext) {
      const nextCfg = ctx.config;
      if (nextCfg !== lastExternalConfig) {
        lastExternalConfig = nextCfg;
        applyExternalConfig(nextCfg);
      }
      applyBlendedConfig(ctx.activeT);
      if (!state || state.seedKey !== ctx.seed) {
        state = createFrostState(ctx.seed, cfg.crystalCount);
      } else if (state.xs.length !== Math.max(6, Math.min(80, Math.round(cfg.crystalCount)))) {
        state = createFrostState(ctx.seed, cfg.crystalCount);
      }
    },
    paint(p: GlassButtonEffectPaintContext) {
      const t = p.strength;
      if (t <= 0.001) {
        return;
      }
      const st = state;
      if (!st) {
        return;
      }

      const blur = p.theme === Themes.dark ? cfg.blurDark : cfg.blurLight;
      const had = p.setFilter(`blur(${blur}px)`);
      p.ctx.save();
      p.ctx.globalCompositeOperation = 'screen';

      const edge = Math.max(0, Math.min(1, cfg.edgeStrength));
      const edgeAlpha = (p.theme === Themes.dark ? 0.22 : 0.2) * t * (0.25 + 0.75 * edge);
      const g = p.ctx.createRadialGradient(
        p.width * 0.5,
        p.height * 0.5,
        0,
        p.width * 0.5,
        p.height * 0.5,
        Math.hypot(p.width, p.height) * 0.65,
      );
      g.addColorStop(0, applyAlpha('#ffffff', 0));
      g.addColorStop(0.65, applyAlpha('#ffffff', edgeAlpha));
      g.addColorStop(1, applyAlpha('#ffffff', edgeAlpha * 1.15));
      p.ctx.globalAlpha = 1;
      p.ctx.fillStyle = g;
      p.ctx.fillRect(0, 0, p.width, p.height);

      const maxR = Math.max(6, Math.min(34, cfg.maxCrystalRadius));
      for (let i = 0; i < st.xs.length; i++) {
        const tw = 0.5 + 0.5 * Math.sin((p.phase * (0.7 + st.ws[i]) + i * 0.12) * Math.PI * 2);
        const a0 = (p.theme === Themes.dark ? 0.14 : 0.12) * t * (0.2 + 0.8 * tw);
        if (a0 <= 0.001) {
          continue;
        }
        const x = st.xs[i] * p.width;
        const y = st.ys[i] * p.height;
        const r = maxR * (0.25 + 0.75 * st.rs[i]) * (0.6 + 0.55 * tw);

        p.ctx.globalAlpha = a0;
        const c = p.ctx.createRadialGradient(x, y, 0, x, y, r);
        c.addColorStop(0, applyAlpha('#ffffff', 0.85));
        c.addColorStop(0.5, applyAlpha('#ffffff', 0.18));
        c.addColorStop(1, applyAlpha('#ffffff', 0));
        p.ctx.fillStyle = c;
        p.ctx.beginPath();
        p.ctx.arc(x, y, r, 0, Math.PI * 2);
        p.ctx.fill();

        p.ctx.globalAlpha = a0 * 0.55;
        p.ctx.strokeStyle = applyAlpha(p.tint, p.theme === Themes.dark ? 0.42 : 0.34);
        p.ctx.lineWidth = Math.max(1, Math.min(2.2, p.height * 0.02));
        p.ctx.beginPath();
        p.ctx.moveTo(x - r * 0.9, y);
        p.ctx.lineTo(x + r * 0.9, y);
        p.ctx.moveTo(x, y - r * 0.9);
        p.ctx.lineTo(x, y + r * 0.9);
        p.ctx.stroke();
      }

      p.ctx.restore();
      if (had) {
        p.setFilter(null);
      }
    },
    dispose() {
      state = undefined;
      lastExternalConfig = undefined;
    },
  };

  return createPausableEffect('frost', impl);
}
