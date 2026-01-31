/**
 * @file 玻璃按钮特效：潮汐拍岸（Wave）
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
 * @description Wave 特效配置
 */
export interface GlassButtonWaveEffectConfig {
  /** 模糊半径（暗色主题） */
  blurDark: number;
  /** 模糊半径（亮色主题） */
  blurLight: number;
  /** 浪峰高度（像素）：越大越“拍岸” */
  crestHeight: number;
  /** 波长（像素）：越小波纹越密 */
  wavelength: number;
  /** 速度（相位/秒）：越大越快 */
  speed: number;
  /** 上岸距离比例（0..1）：strength=1 时浪能爬多高 */
  runupRatio: number;
  /** 泡沫数量（越大越绵密） */
  foamCount: number;
  /** 泡沫大小（像素） */
  foamSize: number;
  /** 泡沫抖动（像素） */
  foamJitter: number;
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

function resolveWaveConfig(
  prev: GlassButtonWaveEffectConfig,
  next: Partial<GlassButtonWaveEffectConfig>,
): GlassButtonWaveEffectConfig {
  const cfg: GlassButtonWaveEffectConfig = { ...prev };
  const setNum = (key: keyof GlassButtonWaveEffectConfig, min: number, max: number) => {
    const v = next[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      (cfg as unknown as Record<string, number>)[key as string] = Math.max(min, Math.min(max, v));
    }
  };
  setNum('blurDark', 0, 60);
  setNum('blurLight', 0, 60);
  setNum('crestHeight', 2, 80);
  setNum('wavelength', 24, 420);
  setNum('speed', 0, 6);
  setNum('runupRatio', 0, 1);
  setNum('foamCount', 0, 140);
  setNum('foamSize', 0.5, 14);
  setNum('foamJitter', 0, 32);
  cfg.foamCount = Math.round(cfg.foamCount);
  return cfg;
}

function waveY(
  x: number,
  width: number,
  baseY: number,
  phase: number,
  wavelength: number,
  crestH: number,
  focusX: number,
): number {
  const dx = (x - focusX) / Math.max(1, width);
  const focus = Math.exp(-dx * dx * 8.5);
  const k = (Math.PI * 2) / Math.max(24, wavelength);
  const s1 = Math.sin(x * k + phase);
  const s2 = Math.sin(x * k * 0.52 + phase * 1.4 + 1.2);
  return baseY + (s1 * 0.72 + s2 * 0.28) * crestH * (0.55 + 0.45 * focus);
}

/**
 * @description 创建 Wave 特效
 * @param config {Partial<GlassButtonWaveEffectConfig>} 配置
 * @returns {GlassButtonEffect} 特效实例
 */
export function createWaveEffect(config?: Partial<GlassButtonWaveEffectConfig>): GlassButtonEffect {
  const base: GlassButtonWaveEffectConfig = {
    blurDark: 14,
    blurLight: 16,
    crestHeight: 18,
    wavelength: 140,
    speed: 1.25,
    runupRatio: 0.62,
    foamCount: 28,
    foamSize: 3,
    foamJitter: 10,
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const asObj = (v: unknown) =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;

  let cfgHover = resolveWaveConfig(base, config ?? {});
  let cfgActive = cfgHover;
  const cfg = { ...cfgHover };
  let lastExternalConfig: unknown = undefined;
  let seed: string = 'wave-seed';

  const applyBlendedConfig = (activeT: number) => {
    const t = clamp01(activeT);
    cfg.blurDark = lerp(cfgHover.blurDark, cfgActive.blurDark, t);
    cfg.blurLight = lerp(cfgHover.blurLight, cfgActive.blurLight, t);
    cfg.crestHeight = lerp(cfgHover.crestHeight, cfgActive.crestHeight, t);
    cfg.wavelength = lerp(cfgHover.wavelength, cfgActive.wavelength, t);
    cfg.speed = lerp(cfgHover.speed, cfgActive.speed, t);
    cfg.runupRatio = lerp(cfgHover.runupRatio, cfgActive.runupRatio, t);
    cfg.foamSize = lerp(cfgHover.foamSize, cfgActive.foamSize, t);
    cfg.foamJitter = lerp(cfgHover.foamJitter, cfgActive.foamJitter, t);
    cfg.foamCount = Math.round(t >= 0.5 ? cfgActive.foamCount : cfgHover.foamCount);
  };

  const applyExternalConfig = (external: unknown) => {
    const obj = asObj(external);
    const hover = asObj(obj?.hover);
    const active = asObj(obj?.active);
    if (hover || active) {
      cfgHover = resolveWaveConfig(base, (hover ?? {}) as Partial<GlassButtonWaveEffectConfig>);
      cfgActive = resolveWaveConfig(base, (active ?? {}) as Partial<GlassButtonWaveEffectConfig>);
    } else {
      cfgHover = resolveWaveConfig(base, (obj ?? {}) as Partial<GlassButtonWaveEffectConfig>);
      cfgActive = cfgHover;
    }
  };

  const impl: Omit<GlassButtonEffect, 'name' | 'pause' | 'resume'> = {
    update(_dt: number, ctx: GlassButtonEffectRuntimeContext) {
      if (typeof ctx.seed === 'string' && ctx.seed) {
        seed = ctx.seed;
      }
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

      const width = p.width;
      const height = p.height;
      const phase = p.phase * cfg.speed * Math.PI * 2;
      const focusX = Math.max(0, Math.min(width, p.x));

      const runup = height * (0.14 + cfg.runupRatio * 0.72 * t);
      const baseY = height - runup;
      const crestH = Math.max(2, Math.min(80, cfg.crestHeight)) * (0.4 + 0.6 * t);
      const waveLen = Math.max(24, cfg.wavelength);

      const blur = p.theme === Themes.dark ? cfg.blurDark : cfg.blurLight;
      const had = p.setFilter(`blur(${blur}px)`);

      p.ctx.save();
      p.ctx.globalCompositeOperation = 'screen';

      const waterAlpha = (p.theme === Themes.dark ? 0.22 : 0.18) * t;
      const foamAlpha = (p.theme === Themes.dark ? 0.26 : 0.22) * t;
      const sandAlpha = (p.theme === Themes.dark ? 0.12 : 0.08) * t;

      const water = p.ctx.createLinearGradient(0, baseY - crestH * 3, 0, height);
      water.addColorStop(0, applyAlpha(p.tint, 0));
      water.addColorStop(0.35, applyAlpha(p.tint, waterAlpha));
      water.addColorStop(1, applyAlpha('#ffffff', waterAlpha * 0.35));

      p.ctx.fillStyle = water;
      p.ctx.beginPath();
      p.ctx.moveTo(0, height);
      p.ctx.lineTo(0, waveY(0, width, baseY, phase, waveLen, crestH, focusX));
      const steps = Math.max(24, Math.min(120, Math.round(width / 8)));
      for (let i = 1; i <= steps; i++) {
        const x = (i / steps) * width;
        const y = waveY(x, width, baseY, phase, waveLen, crestH, focusX);
        p.ctx.lineTo(x, y);
      }
      p.ctx.lineTo(width, height);
      p.ctx.closePath();
      p.ctx.fill();

      const sand = p.ctx.createLinearGradient(0, baseY - crestH * 1.4, 0, baseY + crestH * 2.2);
      sand.addColorStop(0, applyAlpha('#ffd59e', 0));
      sand.addColorStop(0.4, applyAlpha('#ffd59e', sandAlpha));
      sand.addColorStop(1, applyAlpha('#6b4a22', sandAlpha * 0.35));
      p.ctx.globalAlpha = 1;
      p.ctx.fillStyle = sand;
      p.ctx.fillRect(0, baseY - crestH * 1.6, width, crestH * 3.6);

      const s = { v: hashSeed(seed) ^ 0x6a09e667 ^ Math.floor(p.phase * 60) };
      const foamCount = Math.max(0, Math.min(140, cfg.foamCount));
      const foamSize = Math.max(0.5, Math.min(14, cfg.foamSize));
      const foamJitter = Math.max(0, Math.min(32, cfg.foamJitter));

      for (let i = 0; i < foamCount; i++) {
        const r = rand01(s);
        const x = Math.max(0, Math.min(width, ((i + r) / Math.max(1, foamCount)) * width));
        const y0 = waveY(x, width, baseY, phase, waveLen, crestH, focusX);
        const jy = (rand01(s) * 2 - 1) * foamJitter;
        const jx = (rand01(s) * 2 - 1) * foamJitter * 0.7;
        const rr = foamSize * (0.55 + 0.9 * rand01(s)) * (0.6 + 0.4 * t);

        p.ctx.globalAlpha = foamAlpha * (0.35 + 0.65 * rand01(s));
        const g = p.ctx.createRadialGradient(x + jx, y0 + jy, 0, x + jx, y0 + jy, rr);
        g.addColorStop(0, applyAlpha('#ffffff', 0.9));
        g.addColorStop(0.45, applyAlpha('#ffffff', 0.28));
        g.addColorStop(1, applyAlpha('#ffffff', 0));
        p.ctx.fillStyle = g;
        p.ctx.beginPath();
        p.ctx.arc(x + jx, y0 + jy, rr, 0, Math.PI * 2);
        p.ctx.fill();
      }

      p.ctx.restore();
      if (had) {
        p.setFilter(null);
      }
    },
    dispose() {
      lastExternalConfig = undefined;
    },
  };

  return createPausableEffect('wave', impl);
}
