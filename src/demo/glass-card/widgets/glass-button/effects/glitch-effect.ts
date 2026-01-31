/**
 * @file 玻璃按钮特效：朋克（Cyberpunk）
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
 * @description 朋克特效配置
 */
export interface GlassButtonCyberpunkEffectConfig {
  /** 扫描线数量 */
  slices: number;
  /** 扫描线宽度（像素） */
  sliceLineWidth: number;
  /** 最大水平偏移（像素） */
  maxShift: number;
  /** 雪花点数量 */
  dotCount: number;
  /** 扫描线指示条宽度（像素） */
  scanLineWidth: number;
  /** 模糊半径（暗色主题） */
  blurDark: number;
  /** 模糊半径（亮色主题） */
  blurLight: number;
}

function resolveCyberpunkConfig(
  prev: GlassButtonCyberpunkEffectConfig,
  next: Partial<GlassButtonCyberpunkEffectConfig>,
): GlassButtonCyberpunkEffectConfig {
  const cfg: GlassButtonCyberpunkEffectConfig = { ...prev };
  const setNum = (key: keyof GlassButtonCyberpunkEffectConfig, min: number, max: number) => {
    const v = next[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      (cfg as unknown as Record<string, number>)[key as string] = Math.max(min, Math.min(max, v));
    }
  };
  setNum('slices', 3, 24);
  setNum('sliceLineWidth', 0.5, 8);
  setNum('maxShift', 0, 30);
  setNum('dotCount', 0, 520);
  setNum('scanLineWidth', 0.5, 8);
  setNum('blurDark', 0, 60);
  setNum('blurLight', 0, 60);
  cfg.slices = Math.round(cfg.slices);
  cfg.maxShift = Math.round(cfg.maxShift);
  cfg.dotCount = Math.round(cfg.dotCount);
  return cfg;
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

/**
 * @description 创建朋克特效
 * @param config {Partial<GlassButtonCyberpunkEffectConfig>} 配置
 * @returns {GlassButtonEffect} 特效实例
 */
export function createCyberpunkEffect(
  config?: Partial<GlassButtonCyberpunkEffectConfig>,
): GlassButtonEffect {
  const base: GlassButtonCyberpunkEffectConfig = {
    slices: 12,
    sliceLineWidth: 1.4,
    maxShift: 8,
    dotCount: 160,
    scanLineWidth: 1,
    blurDark: 2.2,
    blurLight: 2.6,
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const asObj = (v: unknown) =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;

  let cfgHover = resolveCyberpunkConfig(base, config ?? {});
  let cfgActive = cfgHover;
  const cfg = { ...cfgHover };
  let lastExternalConfig: unknown = undefined;

  const applyBlendedConfig = (activeT: number) => {
    const t = clamp01(activeT);
    cfg.slices = Math.round(lerp(cfgHover.slices, cfgActive.slices, t));
    cfg.dotCount = Math.round(lerp(cfgHover.dotCount, cfgActive.dotCount, t));
    cfg.maxShift = lerp(cfgHover.maxShift, cfgActive.maxShift, t);
    cfg.sliceLineWidth = lerp(cfgHover.sliceLineWidth, cfgActive.sliceLineWidth, t);
    cfg.scanLineWidth = lerp(cfgHover.scanLineWidth, cfgActive.scanLineWidth, t);
    cfg.blurDark = lerp(cfgHover.blurDark, cfgActive.blurDark, t);
    cfg.blurLight = lerp(cfgHover.blurLight, cfgActive.blurLight, t);
  };

  const applyExternalConfig = (external: unknown) => {
    const obj = asObj(external);
    const hover = asObj(obj?.hover);
    const active = asObj(obj?.active);
    if (hover || active) {
      cfgHover = resolveCyberpunkConfig(
        base,
        (hover ?? {}) as Partial<GlassButtonCyberpunkEffectConfig>,
      );
      cfgActive = resolveCyberpunkConfig(
        base,
        (active ?? {}) as Partial<GlassButtonCyberpunkEffectConfig>,
      );
    } else {
      cfgHover = resolveCyberpunkConfig(
        base,
        (obj ?? {}) as Partial<GlassButtonCyberpunkEffectConfig>,
      );
      cfgActive = cfgHover;
    }
  };

  let seed = 0;
  let seedKey = '';
  let accum = 0;

  const impl: Omit<GlassButtonEffect, 'name' | 'pause' | 'resume'> = {
    update(dt: number, ctx: GlassButtonEffectRuntimeContext) {
      const nextCfg = ctx.config;
      if (nextCfg !== lastExternalConfig) {
        lastExternalConfig = nextCfg;
        applyExternalConfig(nextCfg);
      }
      applyBlendedConfig(ctx.activeT);
      if (seedKey !== ctx.seed) {
        seedKey = ctx.seed;
        seed = hashSeed(seedKey);
      }
      accum += dt;
    },
    paint(p: GlassButtonEffectPaintContext) {
      const t = p.strength;
      if (t <= 0.001) {
        return;
      }

      const s = { v: seed ^ Math.floor(accum * 60) };
      const slices = Math.max(3, Math.min(24, Math.round(cfg.slices)));
      const maxShift = Math.max(0, Math.min(30, cfg.maxShift));
      const neonW = Math.max(0.5, Math.min(8, cfg.sliceLineWidth));
      const scanW = Math.max(0.5, Math.min(8, cfg.scanLineWidth));

      const blur = p.theme === Themes.dark ? cfg.blurDark : cfg.blurLight;
      const had = p.setFilter(`blur(${blur}px)`);

      p.ctx.save();
      p.ctx.globalCompositeOperation = 'screen';

      const cx = Math.max(0, Math.min(p.width, p.x));
      const cy = Math.max(0, Math.min(p.height, p.y));
      const glow = p.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(p.width, p.height) * 0.9);
      glow.addColorStop(0, applyAlpha(p.tint, p.theme === Themes.dark ? 0.6 : 0.46));
      glow.addColorStop(0.5, applyAlpha('#64e6ff', p.theme === Themes.dark ? 0.18 : 0.14));
      glow.addColorStop(1, applyAlpha('#ff4bd9', 0));
      p.ctx.globalAlpha = (p.theme === Themes.dark ? 0.22 : 0.18) * t;
      p.ctx.fillStyle = glow;
      p.ctx.fillRect(0, 0, p.width, p.height);

      const stepX = p.width / slices;
      const stepY = p.height / slices;
      const gridA = (p.theme === Themes.dark ? 0.08 : 0.06) * t;
      p.ctx.globalAlpha = gridA;
      p.ctx.lineWidth = Math.max(0.5, Math.min(2.4, neonW * 0.65));
      p.ctx.strokeStyle = applyAlpha('#64e6ff', 1);
      for (let i = 1; i < slices; i++) {
        const x = i * stepX;
        p.ctx.beginPath();
        p.ctx.moveTo(x, 0);
        p.ctx.lineTo(x, p.height);
        p.ctx.stroke();
      }
      p.ctx.strokeStyle = applyAlpha('#ff4bd9', 1);
      for (let i = 1; i < slices; i++) {
        const y = i * stepY;
        p.ctx.beginPath();
        p.ctx.moveTo(0, y);
        p.ctx.lineTo(p.width, y);
        p.ctx.stroke();
      }

      const cornerLen = Math.max(10, Math.min(p.width, p.height) * 0.22);
      const cornerInset = Math.max(4, neonW * 2.2);
      const drawCorner = (x: number, y: number, sx: number, sy: number, c: string) => {
        p.ctx.strokeStyle = applyAlpha(c, 1);
        p.ctx.lineWidth = neonW;
        p.ctx.beginPath();
        p.ctx.moveTo(x, y + sy * cornerLen);
        p.ctx.lineTo(x, y);
        p.ctx.lineTo(x + sx * cornerLen, y);
        p.ctx.stroke();
      };
      p.ctx.globalAlpha = (p.theme === Themes.dark ? 0.22 : 0.18) * t;
      drawCorner(cornerInset, cornerInset, 1, 1, '#64e6ff');
      drawCorner(p.width - cornerInset, cornerInset, -1, 1, '#ff4bd9');
      drawCorner(cornerInset, p.height - cornerInset, 1, -1, '#ff4bd9');
      drawCorner(p.width - cornerInset, p.height - cornerInset, -1, -1, '#64e6ff');

      const barY = p.height - Math.max(10, p.height * 0.18);
      const barH = Math.max(2, neonW * 1.1);
      const barCount = Math.max(4, Math.min(18, Math.round(slices * 0.75)));
      const barW = (p.width * 0.82) / barCount;
      const barX0 = (p.width - barW * barCount) * 0.5;
      p.ctx.globalAlpha = (p.theme === Themes.dark ? 0.18 : 0.14) * t;
      for (let i = 0; i < barCount; i++) {
        const jitter = (rand01(s) * 2 - 1) * maxShift * (0.25 + 0.75 * t);
        const w = barW * (0.35 + 0.65 * rand01(s));
        p.ctx.fillStyle = applyAlpha(i % 2 === 0 ? '#64e6ff' : '#ff4bd9', 1);
        p.ctx.fillRect(barX0 + i * barW + jitter, barY, w, barH);
      }

      const yBarCount = Math.max(3, Math.round(barCount * (0.55 + 0.85 * t)));
      const yBarMinW = p.width * 0.18;
      const yBarMaxW = p.width * 0.86;
      const yBarH = Math.max(1, Math.min(8, barH * 0.9));
      for (let i = 0; i < yBarCount; i++) {
        const y = rand01(s) * p.height;
        const w = yBarMinW + (yBarMaxW - yBarMinW) * rand01(s);
        const x0 =
          rand01(s) * Math.max(0, p.width - w) + (rand01(s) * 2 - 1) * maxShift * (0.18 + 0.82 * t);
        const a = (p.theme === Themes.dark ? 0.16 : 0.12) * t * (0.25 + 0.75 * rand01(s));
        p.ctx.globalAlpha = a;
        p.ctx.fillStyle = applyAlpha(rand01(s) < 0.55 ? '#64e6ff' : '#ff4bd9', 1);
        p.ctx.fillRect(x0, y, w, yBarH);
      }

      const dotCount = Math.round(cfg.dotCount * (0.35 + 0.65 * t));
      for (let i = 0; i < dotCount; i++) {
        const x = rand01(s) * p.width;
        const y = rand01(s) * p.height;
        const w = 0.8 + rand01(s) * 1.8;
        const h = 0.8 + rand01(s) * 2.2;
        const c = rand01(s);
        const a = (p.theme === Themes.dark ? 0.2 : 0.16) * t * (0.25 + 0.75 * rand01(s));
        p.ctx.globalAlpha = a;
        p.ctx.fillStyle =
          c < 0.62
            ? applyAlpha('#ffffff', 1)
            : c < 0.82
              ? applyAlpha('#64e6ff', 1)
              : applyAlpha('#ff4bd9', 1);
        p.ctx.fillRect(x, y, w, h);
      }

      p.ctx.globalAlpha = (p.theme === Themes.dark ? 0.1 : 0.08) * t;
      p.ctx.fillStyle = applyAlpha('#ffffff', 1);
      const scanY = (accum * 0.65) % 1;
      const sy = scanY * p.height;
      p.ctx.fillRect(0, sy, p.width, scanW);

      p.ctx.restore();
      if (had) {
        p.setFilter(null);
      }
    },
    dispose() {
      seedKey = '';
      seed = 0;
      accum = 0;
      lastExternalConfig = undefined;
    },
  };

  return createPausableEffect('cyberpunk', impl);
}
