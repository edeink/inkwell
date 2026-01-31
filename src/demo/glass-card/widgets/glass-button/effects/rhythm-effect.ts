/**
 * @file 玻璃按钮特效：音律闪烁（Sparkle / 音乐频谱）
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
 * @description 音乐特效缓动类型
 */
export type GlassButtonMusicEasing = 'linear' | 'cubicOut' | 'quintOut' | 'expoOut';

/**
 * @description 音乐频谱渐变停靠点
 */
export interface GlassButtonMusicGradientStop {
  /** 位置（0..1） */
  pos: number;
  /** 颜色 */
  color: string;
}

/**
 * @description Sparkle（音乐频谱）特效配置
 */
export interface GlassButtonMusicConfig {
  /** 柱子数量 */
  barCount: number;
  /** 柱子间距（像素） */
  barGap: number;
  /** 内边距（像素）：[top, right, bottom, left] */
  padding?: [number, number, number, number];
  /** 内边距 X（像素） */
  paddingX: number;
  /** 内边距 Y（像素） */
  paddingY: number;
  /** 最小高度比例（0..1） */
  minHeightRatio: number;
  /** 最大高度比例（0..1） */
  maxHeightRatio: number;
  /** 上升速度（越大越快） */
  rise: number;
  /** 下降速度（越大越快） */
  fall: number;
  /** 高度减速系数（模拟“越高越慢”的重力感） */
  heightSlowdown: number;
  /** 频谱幂次（用于增强低频或高频） */
  spectrumPower: number;
  /** 缓动函数 */
  easing: GlassButtonMusicEasing;
  /** 柱子渐变停靠点（可选） */
  barGradientStops?: GlassButtonMusicGradientStop[];
  /** 背景发光模糊半径（暗色主题） */
  glowBlurDark: number;
  /** 背景发光模糊半径（亮色主题） */
  glowBlurLight: number;
  /** 柱状图模糊半径（暗色主题） */
  barsBlurDark: number;
  /** 柱状图模糊半径（亮色主题） */
  barsBlurLight: number;
  /** 是否启用粒子 */
  particles: boolean;
  /** 粒子数量 */
  particleCount: number;
  /** 粒子半径（像素） */
  particleSize: number;
  /** 粒子模糊半径（暗色主题） */
  particleBlurDark: number;
  /** 粒子模糊半径（亮色主题） */
  particleBlurLight: number;
}

interface MusicState {
  barCount: number;
  values: Float32Array;
  peaks: Float32Array;
  env: number;
  beat: number;
  px: Float32Array;
  py: Float32Array;
  pvx: Float32Array;
  pvy: Float32Array;
  plife: Float32Array;
  pmax: Float32Array;
  pCount: number;
  seed: number;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function resolveMusicConfig(
  prev: GlassButtonMusicConfig,
  next: Partial<GlassButtonMusicConfig>,
): GlassButtonMusicConfig {
  const cfg: GlassButtonMusicConfig = { ...prev };

  const setNum = (key: keyof GlassButtonMusicConfig, min: number, max: number) => {
    const v = next[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      (cfg as unknown as Record<string, number>)[key as string] = Math.max(min, Math.min(max, v));
    }
  };

  setNum('barCount', 8, 120);
  setNum('barGap', 0, 16);
  setNum('paddingX', 0, Infinity);
  setNum('paddingY', 0, Infinity);
  setNum('minHeightRatio', 0, 1);
  setNum('maxHeightRatio', 0, 1);
  setNum('rise', 1, 80);
  setNum('fall', 1, 80);
  setNum('heightSlowdown', 0, 10);
  setNum('spectrumPower', 0.2, 2);
  setNum('glowBlurDark', 0, 60);
  setNum('glowBlurLight', 0, 60);
  setNum('barsBlurDark', 0, 60);
  setNum('barsBlurLight', 0, 60);
  setNum('particleCount', 0, 120);
  setNum('particleSize', 0.5, 10);
  setNum('particleBlurDark', 0, 60);
  setNum('particleBlurLight', 0, 60);

  if (typeof next.easing === 'string') {
    const easing = next.easing;
    if (
      easing === 'linear' ||
      easing === 'cubicOut' ||
      easing === 'quintOut' ||
      easing === 'expoOut'
    ) {
      cfg.easing = easing;
    }
  }
  if (typeof next.particles === 'boolean') {
    cfg.particles = next.particles;
  }
  if (Array.isArray(next.padding) && next.padding.length === 4) {
    const [top, right, bottom, left] = next.padding;
    const clamp = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0;
    cfg.padding = [clamp(top), clamp(right), clamp(bottom), clamp(left)];
  }
  if (Array.isArray(next.barGradientStops)) {
    const stops = next.barGradientStops
      .map((s) => {
        const pos =
          typeof s?.pos === 'number' && Number.isFinite(s.pos)
            ? Math.max(0, Math.min(1, s.pos))
            : 0;
        const color = typeof s?.color === 'string' && s.color ? s.color : '#ffffff';
        return { pos, color };
      })
      .sort((a, b) => a.pos - b.pos);
    cfg.barGradientStops = stops.length ? stops : undefined;
  }

  cfg.barCount = Math.round(cfg.barCount);
  cfg.particleCount = Math.round(cfg.particleCount);
  cfg.minHeightRatio = Math.max(0, Math.min(1, cfg.minHeightRatio));
  cfg.maxHeightRatio = Math.max(cfg.minHeightRatio, Math.min(1, cfg.maxHeightRatio));

  return cfg;
}

function ease01(v: number, easing: GlassButtonMusicEasing): number {
  const x = Math.max(0, Math.min(1, v));
  if (easing === 'linear') {
    return x;
  }
  if (easing === 'quintOut') {
    const y = 1 - x;
    return 1 - y * y * y * y * y;
  }
  if (easing === 'expoOut') {
    return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
  }
  const y = 1 - x;
  return 1 - y * y * y;
}

function readSpectrum(
  spectrum: GlassButtonEffectRuntimeContext['musicSpectrum'],
  barIndex: number,
  barCount: number,
  phase: number,
  seed: number,
): number {
  if (spectrum && spectrum.length > 0) {
    const f0 = barCount <= 1 ? 0 : barIndex / (barCount - 1);
    const f = Math.pow(f0, 1.65); // 让低频占据更多柱子
    const idx = Math.max(0, Math.min(spectrum.length - 1, Math.floor(f * (spectrum.length - 1))));
    const raw = Number((spectrum as unknown as number[])[idx]);
    const v = Number.isFinite(raw) ? raw : 0;
    const n = v > 1.5 ? v / 255 : v;
    return Math.max(0, Math.min(1, n));
  }

  const f = barCount <= 1 ? 0 : barIndex / (barCount - 1);
  const a = 0.5 + 0.5 * Math.sin((phase * (1.05 + f * 1.4) + barIndex * 0.11) * Math.PI * 2);
  const b = 0.5 + 0.5 * Math.sin((phase * (0.42 + f * 2.2) + barIndex * 0.07 + 0.37) * Math.PI * 2);
  const c = 0.5 + 0.5 * Math.sin((phase * (1.9 + f * 0.7) + barIndex * 0.18 + 0.9) * Math.PI * 2);
  const wob = 0.62 * a + 0.26 * b + 0.12 * c;
  const beat =
    0.35 + 0.65 * (0.5 + 0.5 * Math.sin((phase * 1.25 + (seed % 97) * 0.0012) * Math.PI * 2));
  return Math.max(0, Math.min(1, wob * (0.55 + 0.45 * beat)));
}

function ensureMusicState(
  prev: MusicState | undefined,
  cfg: GlassButtonMusicConfig,
  seed: string,
): MusicState {
  const barCount = Math.max(8, Math.min(120, Math.round(cfg.barCount)));
  const particleCount = Math.max(0, Math.min(120, Math.round(cfg.particleCount)));
  const s = hashSeed(seed);

  if (prev && prev.barCount === barCount && prev.pCount === particleCount && prev.seed === s) {
    return prev;
  }

  const values = new Float32Array(barCount);
  const peaks = new Float32Array(barCount);
  const px = new Float32Array(particleCount);
  const py = new Float32Array(particleCount);
  const pvx = new Float32Array(particleCount);
  const pvy = new Float32Array(particleCount);
  const plife = new Float32Array(particleCount);
  const pmax = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    plife[i] = 0;
    pmax[i] = 0;
  }

  return {
    barCount,
    values,
    peaks,
    env: 0,
    beat: 0,
    px,
    py,
    pvx,
    pvy,
    plife,
    pmax,
    pCount: particleCount,
    seed: s,
  };
}

function updateMusic(
  dt: number,
  runtime: GlassButtonEffectRuntimeContext,
  cfg: GlassButtonMusicConfig,
  state: MusicState,
): void {
  const n = state.barCount;
  const power = cfg.spectrumPower;
  const minH = cfg.minHeightRatio;
  const maxH = cfg.maxHeightRatio;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = readSpectrum(runtime.musicSpectrum, i, n, runtime.phase, state.seed);
    const s2 = power === 1 ? s : Math.pow(s, power);
    const eased = ease01(s2, cfg.easing);
    const target = minH + (maxH - minH) * eased;
    const cur = state.values[i];
    const diff = target - cur;
    if (diff >= 0) {
      const slow = 1 / (1 + cfg.heightSlowdown * cur);
      const k = 1 - Math.exp(-cfg.rise * slow * dt);
      state.values[i] = cur + diff * k;
    } else {
      const k = 1 - Math.exp(-cfg.fall * dt);
      state.values[i] = cur + diff * k;
    }
    state.peaks[i] = Math.max(state.values[i], state.peaks[i] - dt * 0.8);
    sum += state.values[i];
  }

  const energy = n > 0 ? sum / n : 0;
  const envSpeedUp = 12;
  const envSpeedDown = 5;
  const envK = 1 - Math.exp(-(energy > state.env ? envSpeedUp : envSpeedDown) * dt);
  state.env += (energy - state.env) * envK;
  const beat = Math.max(0, energy - state.env);
  state.beat += (beat - state.beat) * (1 - Math.exp(-18 * dt));

  if (!cfg.particles || state.pCount <= 0) {
    return;
  }

  const spawn = Math.min(6, Math.floor(state.beat * 40));
  if (spawn > 0) {
    for (let k = 0; k < spawn; k++) {
      let best = 0;
      let bestLife = state.plife[0];
      for (let i = 1; i < state.pCount; i++) {
        const l = state.plife[i];
        if (l < bestLife) {
          bestLife = l;
          best = i;
        }
      }
      const s = readSpectrum(
        runtime.musicSpectrum,
        (k * 7 + (state.seed % 31)) % n,
        n,
        runtime.phase,
        state.seed,
      );
      const jitter = (0.5 + 0.5 * Math.sin((runtime.phase * 3.7 + k * 1.3) * Math.PI * 2)) * 2 - 1;
      state.px[best] = jitter * 0.18;
      state.py[best] = 0.55 - s * 0.22;
      state.pvx[best] = jitter * 0.18;
      state.pvy[best] = -0.45 - 0.65 * s;
      state.pmax[best] = 0.25 + 0.35 * s;
      state.plife[best] = state.pmax[best];
    }
  }

  for (let i = 0; i < state.pCount; i++) {
    let life = state.plife[i];
    if (life <= 0) {
      continue;
    }
    life = Math.max(0, life - dt);
    state.plife[i] = life;
    state.pvy[i] += 1.2 * dt;
    state.px[i] += state.pvx[i] * dt;
    state.py[i] += state.pvy[i] * dt;
  }
}

/**
 * @description 创建 Rhythm 特效
 * @param config {Partial<GlassButtonMusicConfig>} 配置
 * @returns {GlassButtonEffect} 特效实例
 */
export function createSparkleEffect(config?: Partial<GlassButtonMusicConfig>): GlassButtonEffect {
  const base: GlassButtonMusicConfig = {
    barCount: 48,
    barGap: 2,
    paddingX: 18,
    paddingY: 16,
    minHeightRatio: 0.08,
    maxHeightRatio: 0.62,
    rise: 22,
    fall: 14,
    heightSlowdown: 2.2,
    spectrumPower: 0.72,
    easing: 'cubicOut',
    glowBlurDark: 22,
    glowBlurLight: 24,
    barsBlurDark: 10,
    barsBlurLight: 12,
    particles: true,
    particleCount: 24,
    particleSize: 2.4,
    particleBlurDark: 8,
    particleBlurLight: 10,
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const asObj = (v: unknown) =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;

  let cfgHover = resolveMusicConfig(base, config ?? {});
  let cfgActive = cfgHover;
  const cfg = { ...cfgHover };
  let music: MusicState | undefined;
  let lastExternalConfig: unknown = undefined;

  const applyBlendedConfig = (activeT: number) => {
    const t = clamp01(activeT);
    const pick = t >= 0.5 ? cfgActive : cfgHover;

    cfg.barCount = pick.barCount;
    cfg.particleCount = pick.particleCount;
    cfg.particles = pick.particles;
    cfg.easing = pick.easing;
    cfg.barGradientStops = pick.barGradientStops;

    cfg.barGap = lerp(cfgHover.barGap, cfgActive.barGap, t);
    cfg.paddingX = lerp(cfgHover.paddingX, cfgActive.paddingX, t);
    cfg.paddingY = lerp(cfgHover.paddingY, cfgActive.paddingY, t);
    cfg.rise = lerp(cfgHover.rise, cfgActive.rise, t);
    cfg.fall = lerp(cfgHover.fall, cfgActive.fall, t);
    cfg.heightSlowdown = lerp(cfgHover.heightSlowdown, cfgActive.heightSlowdown, t);
    cfg.spectrumPower = lerp(cfgHover.spectrumPower, cfgActive.spectrumPower, t);
    cfg.glowBlurDark = lerp(cfgHover.glowBlurDark, cfgActive.glowBlurDark, t);
    cfg.glowBlurLight = lerp(cfgHover.glowBlurLight, cfgActive.glowBlurLight, t);
    cfg.barsBlurDark = lerp(cfgHover.barsBlurDark, cfgActive.barsBlurDark, t);
    cfg.barsBlurLight = lerp(cfgHover.barsBlurLight, cfgActive.barsBlurLight, t);
    cfg.particleSize = lerp(cfgHover.particleSize, cfgActive.particleSize, t);
    cfg.particleBlurDark = lerp(cfgHover.particleBlurDark, cfgActive.particleBlurDark, t);
    cfg.particleBlurLight = lerp(cfgHover.particleBlurLight, cfgActive.particleBlurLight, t);

    cfg.minHeightRatio = lerp(cfgHover.minHeightRatio, cfgActive.minHeightRatio, t);
    const maxHeight = lerp(cfgHover.maxHeightRatio, cfgActive.maxHeightRatio, t);
    cfg.maxHeightRatio = Math.max(cfg.minHeightRatio, maxHeight);

    const padH = cfgHover.padding;
    const padA = cfgActive.padding;
    if (padH && padA) {
      cfg.padding = [
        lerp(padH[0], padA[0], t),
        lerp(padH[1], padA[1], t),
        lerp(padH[2], padA[2], t),
        lerp(padH[3], padA[3], t),
      ];
    } else {
      cfg.padding = t >= 0.5 ? padA : padH;
    }
  };

  const applyExternalConfig = (external: unknown) => {
    const obj = asObj(external);
    const hover = asObj(obj?.hover);
    const active = asObj(obj?.active);
    if (hover || active) {
      cfgHover = resolveMusicConfig(base, (hover ?? {}) as Partial<GlassButtonMusicConfig>);
      cfgActive = resolveMusicConfig(base, (active ?? {}) as Partial<GlassButtonMusicConfig>);
    } else {
      cfgHover = resolveMusicConfig(base, (obj ?? {}) as Partial<GlassButtonMusicConfig>);
      cfgActive = cfgHover;
    }
    music = undefined;
  };

  const impl: Omit<GlassButtonEffect, 'name' | 'pause' | 'resume'> = {
    update(dt: number, ctx: GlassButtonEffectRuntimeContext) {
      const nextCfg = ctx.config;
      if (nextCfg !== lastExternalConfig) {
        lastExternalConfig = nextCfg;
        applyExternalConfig(nextCfg);
      }
      applyBlendedConfig(ctx.activeT);
      if (music && music.barCount !== Math.round(cfg.barCount)) {
        music = undefined;
      }
      music = ensureMusicState(music, cfg, ctx.seed);
      updateMusic(dt, ctx, cfg, music);
    },
    paint(p: GlassButtonEffectPaintContext) {
      /** 强度过低时直接跳过，避免无意义的绘制与滤镜切换 */
      const t = p.strength;
      if (t <= 0.001) {
        return;
      }

      /** 需要在 update 中初始化音乐状态；未初始化时不绘制 */
      const m = music;
      if (!m) {
        return;
      }

      /** 计算内边距与可用绘制区域（支持 CSS 四值 padding，也兼容 paddingX/Y） */
      const pad = cfg.padding;
      const padT = Math.max(0, Array.isArray(pad) ? pad[0] : cfg.paddingY);
      const padR = Math.max(0, Array.isArray(pad) ? pad[1] : cfg.paddingX);
      const padB = Math.max(0, Array.isArray(pad) ? pad[2] : cfg.paddingY);
      const padL = Math.max(0, Array.isArray(pad) ? pad[3] : cfg.paddingX);
      const innerX = padL;
      const innerY = padT;
      const innerW = Math.max(0, p.width - padL - padR);
      const innerH = Math.max(0, p.height - padT - padB);
      if (innerW <= 1 || innerH <= 1 || m.barCount <= 0) {
        return;
      }

      /** 计算柱体的几何参数：柱宽、圆角与基线位置 */
      const barCount = m.barCount;
      const gap = Math.max(0, cfg.barGap);
      const usableW = innerW - gap * (barCount - 1);
      const barW = usableW / barCount;
      if (!(barW > 0.6)) {
        return;
      }
      const barR = Math.max(1, Math.min(8, barW * 0.6));

      /** 定位能量中心：靠近交互锚点（x,y）并锁定在内框范围 */
      const cx = Math.max(innerX, Math.min(innerX + innerW, p.x));
      const baseY = innerY + innerH - 2;
      const maxBarH = innerH * 0.64;
      const energy = Math.max(0, Math.min(1, m.env));
      const beat = Math.max(0, Math.min(1, m.beat * 6));

      /** 第一遍：底部光晕（screen + blur），用于增强玻璃底的能量感 */
      const glowBlur = p.theme === Themes.dark ? cfg.glowBlurDark : cfg.glowBlurLight;
      const glowHadFilter = p.setFilter(`blur(${glowBlur}px)`);
      p.ctx.save();
      p.ctx.globalCompositeOperation = 'screen';
      p.ctx.globalAlpha = (p.theme === Themes.dark ? 0.22 : 0.18) * t * (0.35 + 0.65 * energy);
      const glow = p.ctx.createRadialGradient(cx, baseY, 0, cx, baseY, innerW * 0.8);
      glow.addColorStop(0, applyAlpha(p.tint, p.theme === Themes.dark ? 0.58 : 0.52));
      glow.addColorStop(0.45, applyAlpha('#ffffff', p.theme === Themes.dark ? 0.1 : 0.12));
      glow.addColorStop(1, applyAlpha('#ffffff', 0));
      p.ctx.fillStyle = glow;
      p.ctx.fillRect(0, 0, p.width, p.height);
      p.ctx.restore();
      if (glowHadFilter) {
        p.setFilter(null);
      }

      /** 第二遍：柱体主体（screen + blur），用渐变增强“频谱”纵向层次 */
      const barsBlur = p.theme === Themes.dark ? cfg.barsBlurDark : cfg.barsBlurLight;
      const barsHadFilter = p.setFilter(`blur(${barsBlur}px)`);
      p.ctx.save();
      p.ctx.globalCompositeOperation = 'screen';

      /** 柱体渐变：优先使用外部传入的停靠点，否则走默认配色 */
      const gradY0 = baseY - maxBarH;
      const gradY1 = baseY + maxBarH * 0.25;
      const barsFill = p.ctx.createLinearGradient(0, gradY1, 0, gradY0);
      if (cfg.barGradientStops && cfg.barGradientStops.length >= 2) {
        for (const s of cfg.barGradientStops) {
          barsFill.addColorStop(s.pos, s.color);
        }
      } else {
        barsFill.addColorStop(0, applyAlpha('#ffffff', p.theme === Themes.dark ? 0.9 : 0.95));
        barsFill.addColorStop(0.45, applyAlpha(p.tint, p.theme === Themes.dark ? 0.92 : 0.88));
        barsFill.addColorStop(1, applyAlpha('#ffffff', p.theme === Themes.dark ? 0.22 : 0.26));
      }
      p.ctx.fillStyle = barsFill;

      /** 根据频谱值绘制每根柱体：含能量增强与 beat 轻微抬升 */
      const baseA = (p.theme === Themes.dark ? 0.46 : 0.38) * t;
      for (let i = 0; i < barCount; i++) {
        const v = Math.max(0, Math.min(1, m.values[i]));
        const hh = Math.max(innerH * 0.04, v * innerH);
        const x0 = innerX + i * (barW + gap);
        const y0 = baseY - hh;
        const a0 = baseA * (0.25 + 0.75 * Math.min(1, hh / (maxBarH + 1))) * (0.75 + 0.25 * beat);
        if (a0 <= 0.001) {
          continue;
        }
        p.ctx.globalAlpha = a0;
        p.ctx.beginPath();
        roundedRectPath(p.ctx, x0, y0, barW, hh, barR);
        p.ctx.fill();

        const dh = hh * 0.22;
        if (dh > 0.5) {
          p.ctx.globalAlpha = a0 * 0.22;
          p.ctx.beginPath();
          roundedRectPath(p.ctx, x0, baseY, barW, dh, barR);
          p.ctx.fill();
        }
      }
      p.ctx.restore();
      if (barsHadFilter) {
        p.setFilter(null);
      }

      const peakHadFilter = p.setFilter(`blur(${p.theme === Themes.dark ? 2.2 : 2.6}px)`);
      p.ctx.save();
      p.ctx.globalCompositeOperation = 'screen';
      p.ctx.globalAlpha = (p.theme === Themes.dark ? 0.22 : 0.18) * t * (0.25 + 0.75 * beat);
      p.ctx.strokeStyle = applyAlpha('#ffffff', 1);
      p.ctx.lineWidth = 1.25;
      for (let i = 0; i < barCount; i++) {
        const hh = Math.max(innerH * 0.04, Math.max(0, Math.min(1, m.peaks[i])) * innerH);
        const x0 = innerX + i * (barW + gap);
        const py = baseY - hh;
        if (py < innerY || py > innerY + innerH) {
          continue;
        }
        p.ctx.beginPath();
        p.ctx.moveTo(x0 + barW * 0.15, py);
        p.ctx.lineTo(x0 + barW * 0.85, py);
        p.ctx.stroke();
      }
      p.ctx.restore();
      if (peakHadFilter) {
        p.setFilter(null);
      }

      if (cfg.particles && m.pCount > 0) {
        const pBlur = p.theme === Themes.dark ? cfg.particleBlurDark : cfg.particleBlurLight;
        const pHadFilter = p.setFilter(`blur(${pBlur}px)`);
        p.ctx.save();
        p.ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < m.pCount; i++) {
          const life = m.plife[i];
          if (!(life > 0)) {
            continue;
          }
          const max = m.pmax[i] > 0 ? m.pmax[i] : 0.3;
          const a = Math.max(0, Math.min(1, life / max));
          const px = innerX + innerW * (0.5 + m.px[i]);
          const py = innerY + innerH * m.py[i];
          const rr = cfg.particleSize * (0.7 + 1.1 * a);

          p.ctx.globalAlpha = (p.theme === Themes.dark ? 0.18 : 0.14) * t * a;
          p.ctx.fillStyle = applyAlpha('#ffffff', 1);
          p.ctx.beginPath();
          p.ctx.arc(px, py, rr, 0, Math.PI * 2);
          p.ctx.fill();

          p.ctx.globalAlpha = (p.theme === Themes.dark ? 0.14 : 0.12) * t * a;
          p.ctx.fillStyle = applyAlpha(p.tint, 0.9);
          p.ctx.beginPath();
          p.ctx.arc(px, py, rr * 0.85, 0, Math.PI * 2);
          p.ctx.fill();
        }
        p.ctx.restore();
        if (pHadFilter) {
          p.setFilter(null);
        }
      }
    },
    dispose() {
      music = undefined;
      lastExternalConfig = undefined;
    },
  };

  return createPausableEffect('rhythm', impl);
}
