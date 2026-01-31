import { describe, expect, it, vi } from 'vitest';

import {
  createFrostEffect,
  createCyberpunkEffect,
  createPausableEffect,
  createPrismEffect,
  createRimEffect,
  createSparkleEffect,
} from '../effects';

import type { GlassButtonEffectPaintContext, GlassButtonEffectRuntimeContext } from '../effects';

import { Themes } from '@/styles/theme';

function createRuntimeContext(
  partial?: Partial<GlassButtonEffectRuntimeContext>,
): GlassButtonEffectRuntimeContext {
  return {
    theme: Themes.dark,
    width: 240,
    height: 76,
    tint: '#8f6bff',
    phase: 0.2,
    activeT: 1,
    hoverT: 1,
    seed: 'test-seed',
    ...partial,
  };
}

function createPaintContext(
  partial?: Partial<GlassButtonEffectPaintContext>,
): GlassButtonEffectPaintContext {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 76;
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  const raw = ctx as unknown as {
    createRadialGradient?: unknown;
    createLinearGradient?: unknown;
  };
  if (typeof raw.createRadialGradient !== 'function') {
    (ctx as unknown as { createRadialGradient: unknown }).createRadialGradient = vi.fn(() => ({
      addColorStop: vi.fn(),
    }));
  }
  if (typeof raw.createLinearGradient !== 'function') {
    (ctx as unknown as { createLinearGradient: unknown }).createLinearGradient = vi.fn(() => ({
      addColorStop: vi.fn(),
    }));
  }
  const setFilter = vi.fn((_v: string | null) => true);
  return {
    ctx,
    theme: Themes.dark,
    width: 240,
    height: 76,
    radius: 18,
    tint: '#8f6bff',
    phase: 0.2,
    setFilter,
    strength: 1,
    x: 120,
    y: 38,
    activeT: 1,
    hoverT: 1,
    ...partial,
  };
}

describe('GlassButton 特效模块', () => {
  it('createPausableEffect 应正确暂停与恢复 update', () => {
    let updates = 0;
    const fx = createPausableEffect('rim', {
      update() {
        updates += 1;
      },
      paint() {},
      dispose() {},
    });

    const runtime = createRuntimeContext();
    fx.update(0.016, runtime);
    expect(updates).toBe(1);

    fx.pause();
    fx.update(0.016, runtime);
    expect(updates).toBe(1);

    fx.resume();
    fx.update(0.016, runtime);
    expect(updates).toBe(2);
  });

  it('Rim 特效应使用配置的 blur', () => {
    const fx = createRimEffect({ blurDark: 77, blurLight: 88 });
    expect(fx.name).toBe('rim');

    const p = createPaintContext({ theme: Themes.dark, strength: 1 });
    fx.paint(p);
    expect(p.setFilter).toHaveBeenCalledWith('blur(77px)');

    fx.dispose();
  });

  it('Prism 特效应使用配置的 outline/band blur', () => {
    const fx = createPrismEffect({ outlineBlurDark: 4.2, bandBlurDark: 21 });
    expect(fx.name).toBe('prism');

    const p = createPaintContext({ theme: Themes.dark, strength: 1 });
    fx.paint(p);
    expect(p.setFilter).toHaveBeenCalledWith('blur(4.2px)');
    expect(p.setFilter).toHaveBeenCalledWith('blur(21px)');

    fx.dispose();
  });

  it('Rhythm（音乐频谱）特效应使用 glow/bars blur 并可清理', () => {
    const fx = createSparkleEffect({
      glowBlurDark: 12,
      barsBlurDark: 13,
      particles: false,
      barCount: 12,
    });
    expect(fx.name).toBe('rhythm');

    const runtime = createRuntimeContext({
      musicSpectrum: new Float32Array(32).fill(0.6),
    });
    fx.update(0.016, runtime);

    const p = createPaintContext({ theme: Themes.dark, strength: 1 });
    fx.paint(p);
    expect(p.setFilter).toHaveBeenCalledWith('blur(12px)');
    expect(p.setFilter).toHaveBeenCalledWith('blur(13px)');

    fx.dispose();
    expect(() => fx.paint(p)).not.toThrow();
  });

  it('Cyberpunk/Frost 特效应可绘制与清理', () => {
    const runtime = createRuntimeContext();

    const cyberpunk = createCyberpunkEffect({ blurDark: 3.3 });
    const frost = createFrostEffect({ blurDark: 11 });

    const p = createPaintContext({ theme: Themes.dark, strength: 1 });

    cyberpunk.update(0.016, runtime);
    cyberpunk.paint({ ...p, setFilter: vi.fn((_v: string | null) => true) });
    frost.update(0.016, runtime);
    frost.paint({ ...p, setFilter: vi.fn((_v: string | null) => true) });

    cyberpunk.dispose();
    frost.dispose();
  });
});
