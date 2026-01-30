import type { BoxConstraints, BuildContext, Size, WidgetProps } from '@/core';
import type { ThemePalette } from '@/styles/theme';

import { Widget } from '@/core';
import { Themes } from '@/styles/theme';

/*
 * GlassCalendarCard：玻璃日历卡片的“特效层”。
 * - 只做绘制：背景渐变、圆弧带、裁剪与边缘渐隐、放大镜高亮等
 * - 外层 GlassCalendar 负责状态与布局，只把时间轴/天气主题等数据传进来
 *
 * 性能说明：
 * paintSelf 高频调用，尽量复用离屏 layer（text/lens/wheel）减少滤镜与重复绘制开销。
 */
export interface GlassCalendarCardProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
  currentTime?: number;
  timelineStartTime?: number;
  timelineSelectedIndex?: number;
  timelineSegmentCount?: number;
  weatherThemeFrom?: WeatherKind;
  weatherThemeTo?: WeatherKind;
  weatherThemeT?: number;
}

type TextLayer = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export enum WeatherKind {
  Sunny = 'sunny',
  Rainy = 'rainy',
  Snowy = 'snowy',
  Night = 'night',
}

export type WeatherThemePalette = {
  bgTop: string;
  bgBottom: string;
  highlight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  iconStroke: string;
};

export const WEATHER_THEMES: Record<WeatherKind, WeatherThemePalette> = {
  [WeatherKind.Sunny]: {
    bgTop: '#9dddf9',
    bgBottom: '#5aa7d9',
    highlight: '#e8fbff',
    textPrimary: '#ffffff',
    textSecondary: '#e3f5ff',
    textMuted: '#cfe9f6',
    accent: '#7ed0ff',
    iconStroke: '#2f4a5a',
  },
  [WeatherKind.Rainy]: {
    bgTop: '#c9cdd2',
    bgBottom: '#8e949b',
    highlight: '#f1f3f5',
    textPrimary: '#1f2a33',
    textSecondary: '#2d3742',
    textMuted: '#6a747d',
    accent: '#9aa1a8',
    iconStroke: '#2c3136',
  },
  [WeatherKind.Snowy]: {
    bgTop: '#e6f2ff',
    bgBottom: '#89a4c8',
    highlight: '#f6fbff',
    textPrimary: '#ffffff',
    textSecondary: '#edf6ff',
    textMuted: '#d5e5f3',
    accent: '#c8e7ff',
    iconStroke: '#283a49',
  },
  [WeatherKind.Night]: {
    bgTop: '#142a4f',
    bgBottom: '#07152c',
    highlight: '#eaf2ff',
    textPrimary: '#ffffff',
    textSecondary: '#e3eeff',
    textMuted: '#b9cbe4',
    accent: '#7ea7ff',
    iconStroke: '#d8e8ff',
  },
};

function startOfDay(d: Date): Date {
  const nd = new Date(d.getTime());
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function addDays(d: Date, delta: number): Date {
  const nd = startOfDay(d);
  nd.setDate(nd.getDate() + delta);
  return nd;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  const p = 1 - t;
  return 1 - p * p * p;
}

function normalizeAngle(a: number): number {
  const tau = Math.PI * 2;
  let v = a % tau;
  if (v < 0) {
    v += tau;
  }
  return v;
}

function shortestAngleDiff(a: number, b: number): number {
  const tau = Math.PI * 2;
  let d = normalizeAngle(a) - normalizeAngle(b);
  if (d > Math.PI) {
    d -= tau;
  }
  if (d < -Math.PI) {
    d += tau;
  }
  return d;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '').trim();
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    return { r, g, b };
  }
  const num = parseInt(raw, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function parseColor(raw: string): { r: number; g: number; b: number } {
  const v = raw.trim();
  if (v.startsWith('rgb(')) {
    const m = v.match(/rgb\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)/);
    if (m) {
      return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
    }
  }
  if (v.startsWith('rgba(')) {
    const m = v.match(/rgba\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9.]+)\s*\)/);
    if (m) {
      return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
    }
  }
  return parseHex(v);
}

function mixRgb(a: string, b: string, t: number): string {
  const c1 = parseColor(a);
  const c2 = parseColor(b);
  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b2 = Math.round(lerp(c1.b, c2.b, t));
  return `rgb(${r}, ${g}, ${b2})`;
}

function sampleDiagonalGradientColor(
  width: number,
  height: number,
  x: number,
  y: number,
  c0: string,
  c1: string,
): string {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const denom = w * w + h * h;
  const t = denom > 0 ? clamp((x * w + y * h) / denom, 0, 1) : 0;
  return mixRgb(c0, c1, t);
}

function rgba(hex: string, alpha: number): string {
  const raw = hex.trim();
  if (raw.startsWith('rgba(')) {
    return raw;
  }
  if (raw.startsWith('rgb(')) {
    const m = raw.match(/rgb\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)/);
    if (!m) {
      return raw;
    }
    return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
  }
  const c = parseHex(raw);
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

export class GlassCalendarCard extends Widget<GlassCalendarCardProps> {
  private cardW?: number;
  private cardH?: number;
  private theme?: ThemePalette;
  private currentTime: number = startOfDay(new Date()).getTime();
  private weatherThemeFrom: WeatherKind = WeatherKind.Sunny;
  private weatherThemeTo: WeatherKind = WeatherKind.Sunny;
  private weatherThemeT: number = 0;
  private wheelRotation: number = 0;
  private wheelRotationFrom: number = 0;
  private wheelRotationTo: number = 0;
  private wheelRotationStartTime: number = 0;
  private wheelRotationRaf: number | null = null;
  private wheelRotationKey: string = '';
  private wheelSpinOffset: number = 0;
  private wheelSpinFrom: number = 0;
  private wheelSpinTo: number = 0;
  private wheelSpinStartTime: number = 0;
  private wheelSpinRaf: number | null = null;
  private paletteKey: string = '';
  private scaleKey: string = '';
  private cachedPalette: {
    bgTop: string;
    bgBottom: string;
    highlight: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    iconStroke: string;
  } | null = null;
  private scaleCache: {
    segmentCount: number;
    selectedIndex: number;
    days: number[];
    weekdays: string[];
  } | null = null;
  private timelineSegmentCount: number = 21;
  private timelineStartTime: number = addDays(new Date(this.currentTime), -10).getTime();
  private timelineSelectedIndex: number = 10;
  private textLayer: TextLayer | null = null;
  private lensLayer: TextLayer | null = null;
  private wheelLayer: TextLayer | null = null;
  private grainCanvas: HTMLCanvasElement | null = null;
  private grainKey: string = '';

  /*
   * 计算日期之间的视觉角步进（angleStep）。
   * 目标是让“左3 + 中1 + 右3”共 7 个日期在红框裁剪区域内可见：
   * - 先用红框可视宽度（扣掉边缘渐隐区域）反推弧上可用的最大半角 maxTheta
   * - 再把 maxTheta 均分给 3 个 side + 中心附近留一点空间，得到 angleStep
   */
  private getVisualAngleStep(segmentCount: number): number {
    const tau = Math.PI * 2;
    const base = segmentCount > 0 ? tau / segmentCount : tau;
    const { width, height } = this.renderObject.size;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return base;
    }

    const radius = Math.min(26, height * 0.12);
    const desiredPadX = 24;
    const viewportX = clamp(desiredPadX, radius + 6, width / 2 - 1);
    const viewportW = Math.max(1, width - viewportX * 2);
    const arcRadius = width * 1.72;

    const fadeX = clamp(viewportW * 0.12, 22, 56);
    const halfW = Math.max(1, viewportW / 2 - 6 - fadeX * 0.9);
    const ratio = clamp(halfW / arcRadius, 0, 0.999999);
    const maxTheta = Math.asin(ratio);
    const visibleSide = 3;
    return clamp(maxTheta / (visibleSide + 0.08), 0.005, 0.22);
  }

  constructor(data: GlassCalendarCardProps) {
    super(data);
    this.isRepaintBoundary = true;
  }

  createElement(data: GlassCalendarCardProps): Widget<GlassCalendarCardProps> {
    const prevSegmentCount = this.timelineSegmentCount;
    const prevSelectedIndex = this.timelineSelectedIndex;
    const prevStartTime = this.timelineStartTime;

    this.cardW = typeof data.width === 'number' ? data.width : undefined;
    this.cardH = typeof data.height === 'number' ? data.height : undefined;
    this.theme = data.theme;
    const nextCurrentTime =
      typeof data.currentTime === 'number' && Number.isFinite(data.currentTime)
        ? data.currentTime
        : this.currentTime;
    this.currentTime = startOfDay(new Date(nextCurrentTime)).getTime();

    const nextSegmentCount =
      typeof data.timelineSegmentCount === 'number' && Number.isFinite(data.timelineSegmentCount)
        ? Math.max(3, Math.floor(data.timelineSegmentCount))
        : this.timelineSegmentCount;
    this.timelineSegmentCount = nextSegmentCount;

    const nextSelectedIndex =
      typeof data.timelineSelectedIndex === 'number' && Number.isFinite(data.timelineSelectedIndex)
        ? Math.max(0, Math.min(nextSegmentCount - 1, Math.floor(data.timelineSelectedIndex)))
        : this.timelineSelectedIndex;
    this.timelineSelectedIndex = nextSelectedIndex;

    const nextStartTime =
      typeof data.timelineStartTime === 'number' && Number.isFinite(data.timelineStartTime)
        ? startOfDay(new Date(data.timelineStartTime)).getTime()
        : this.timelineStartTime;
    this.timelineStartTime = nextStartTime;

    this.weatherThemeFrom = data.weatherThemeFrom ?? this.weatherThemeFrom;
    this.weatherThemeTo = data.weatherThemeTo ?? this.weatherThemeTo;
    const nextWeatherThemeT =
      typeof data.weatherThemeT === 'number' && Number.isFinite(data.weatherThemeT)
        ? data.weatherThemeT
        : this.weatherThemeT;
    this.weatherThemeT = clamp(nextWeatherThemeT, 0, 1);

    const dayMs = 24 * 60 * 60 * 1000;
    const deltaDays =
      prevStartTime !== this.timelineStartTime
        ? Math.round((this.timelineStartTime - prevStartTime) / dayMs)
        : 0;
    if (
      deltaDays !== 0 &&
      prevSelectedIndex === this.timelineSelectedIndex &&
      prevSegmentCount === this.timelineSegmentCount
    ) {
      this.animateWheelSpin(deltaDays, this.timelineSegmentCount);
    }
    return super.createElement(data);
  }

  protected didUpdateWidget(oldProps: GlassCalendarCardProps): void {
    const next = this.data;
    if (oldProps.width !== next.width || oldProps.height !== next.height) {
      this.markNeedsLayout();
      return;
    }
    if (oldProps.theme !== next.theme) {
      this.theme = next.theme;
      this.paletteKey = '';
      this.cachedPalette = null;
    }
    if (
      oldProps.currentTime !== next.currentTime ||
      oldProps.timelineStartTime !== next.timelineStartTime ||
      oldProps.timelineSelectedIndex !== next.timelineSelectedIndex ||
      oldProps.timelineSegmentCount !== next.timelineSegmentCount ||
      oldProps.weatherThemeFrom !== next.weatherThemeFrom ||
      oldProps.weatherThemeTo !== next.weatherThemeTo ||
      oldProps.weatherThemeT !== next.weatherThemeT
    ) {
      this.scaleKey = '';
      this.scaleCache = null;
      this.markNeedsPaint();
    }
  }

  protected performLayout(constraints: BoxConstraints): Size {
    const maxW = Number.isFinite(constraints.maxWidth) ? constraints.maxWidth : 560;
    const maxH = Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : 360;
    const minW = Number.isFinite(constraints.minWidth) ? constraints.minWidth : 0;
    const minH = Number.isFinite(constraints.minHeight) ? constraints.minHeight : 0;
    const w0 = typeof this.cardW === 'number' ? this.cardW : Math.min(520, maxW);
    const h0 = typeof this.cardH === 'number' ? this.cardH : Math.min(340, maxH);
    const width = clamp(w0, minW, maxW);
    const height = clamp(h0, minH, maxH);
    return { width, height };
  }

  private getScale() {
    const key = [
      'timeline',
      String(this.timelineStartTime),
      String(this.timelineSegmentCount),
      String(this.timelineSelectedIndex),
    ].join(':');
    if (this.scaleCache && this.scaleKey === key) {
      return this.scaleCache;
    }

    const segmentCount = this.timelineSegmentCount;
    const days = new Array<number>(segmentCount);
    const weekdays = new Array<string>(segmentCount);
    for (let i = 0; i < segmentCount; i++) {
      const d = addDays(new Date(this.timelineStartTime), i);
      days[i] = d.getDate();
      weekdays[i] = WEEKDAY_LABELS[d.getDay()] ?? '';
    }
    const selectedIndex = clamp(this.timelineSelectedIndex, 0, segmentCount - 1);
    const scale = { segmentCount, selectedIndex, days, weekdays };
    this.scaleKey = key;
    this.scaleCache = scale;
    return scale;
  }

  private animateWheelRotationTo(target: number, key: string) {
    const now = Date.now();
    this.wheelRotationKey = key;
    this.wheelRotationFrom = this.wheelRotation;
    const delta = shortestAngleDiff(target, this.wheelRotation);
    if (Math.abs(delta) < 1e-4) {
      if (this.wheelRotationRaf != null) {
        cancelAnimationFrame(this.wheelRotationRaf);
        this.wheelRotationRaf = null;
      }
      this.wheelRotation = target;
      this.markNeedsPaint();
      return;
    }
    this.wheelRotationTo = this.wheelRotation + delta;
    this.wheelRotationStartTime = now;
    const duration = 360;
    if (this.wheelRotationRaf != null) {
      cancelAnimationFrame(this.wheelRotationRaf);
    }
    const loop = () => {
      const t = Math.min(1, (Date.now() - this.wheelRotationStartTime) / duration);
      const eased = easeOutCubic(t);
      this.wheelRotation =
        this.wheelRotationFrom + (this.wheelRotationTo - this.wheelRotationFrom) * eased;
      this.markNeedsPaint();
      if (t < 1) {
        this.wheelRotationRaf = requestAnimationFrame(loop);
      } else {
        this.wheelRotationRaf = null;
      }
    };
    this.wheelRotationRaf = requestAnimationFrame(loop);
  }

  private animateWheelSpin(deltaDays: number, segmentCount: number) {
    const now = Date.now();
    const angleStep = this.getVisualAngleStep(segmentCount);
    this.wheelSpinFrom = deltaDays * angleStep;
    this.wheelSpinTo = 0;
    this.wheelSpinStartTime = now;
    const duration = 320;
    if (this.wheelSpinRaf != null) {
      cancelAnimationFrame(this.wheelSpinRaf);
    }
    const loop = () => {
      const t = Math.min(1, (Date.now() - this.wheelSpinStartTime) / duration);
      const eased = easeOutCubic(t);
      this.wheelSpinOffset = this.wheelSpinFrom + (this.wheelSpinTo - this.wheelSpinFrom) * eased;
      this.markNeedsPaint();
      if (t < 1) {
        this.wheelSpinRaf = requestAnimationFrame(loop);
      } else {
        this.wheelSpinRaf = null;
      }
    };
    this.wheelSpinRaf = requestAnimationFrame(loop);
  }

  private getPalette(from: WeatherKind, to: WeatherKind, t: number) {
    const key = `${from}:${to}:${t.toFixed(3)}`;
    if (this.cachedPalette && this.paletteKey === key) {
      return this.cachedPalette;
    }
    const a = WEATHER_THEMES[from] ?? WEATHER_THEMES[WeatherKind.Sunny];
    const b = WEATHER_THEMES[to] ?? WEATHER_THEMES[WeatherKind.Sunny];
    const palette = {
      bgTop: mixRgb(a.bgTop, b.bgTop, t),
      bgBottom: mixRgb(a.bgBottom, b.bgBottom, t),
      highlight: mixRgb(a.highlight, b.highlight, t),
      textPrimary: mixRgb(a.textPrimary, b.textPrimary, t),
      textSecondary: mixRgb(a.textSecondary, b.textSecondary, t),
      textMuted: mixRgb(a.textMuted, b.textMuted, t),
      accent: mixRgb(a.accent, b.accent, t),
      iconStroke: mixRgb(a.iconStroke, b.iconStroke, t),
    };
    this.paletteKey = key;
    this.cachedPalette = palette;
    return palette;
  }

  private ensureLayer(
    baseCtx: CanvasRenderingContext2D,
    layer: TextLayer | null,
    width: number,
    height: number,
  ): TextLayer | null {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (layer && layer.canvas.width === w && layer.canvas.height === h) {
      return layer;
    }

    const canvas = (() => {
      const anyCanvas = baseCtx.canvas as unknown as { ownerDocument?: Document } | undefined;
      const doc = anyCanvas?.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
      if (!doc) {
        return null;
      }
      return doc.createElement('canvas');
    })();

    if (!canvas) {
      return null;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }
    return { canvas, ctx };
  }

  private ensureGrainCanvas(baseCtx: CanvasRenderingContext2D): HTMLCanvasElement | null {
    const key = String(this.currentTime);
    if (this.grainCanvas && this.grainKey === key) {
      return this.grainCanvas;
    }
    const canvas = (() => {
      const anyCanvas = baseCtx.canvas as unknown as { ownerDocument?: Document } | undefined;
      const doc = anyCanvas?.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
      if (!doc) {
        return null;
      }
      return doc.createElement('canvas');
    })();
    if (!canvas) {
      return null;
    }

    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    let seed = (this.currentTime ^ 0x9e3779b9) >>> 0;
    const rand = () => {
      seed ^= (seed << 13) >>> 0;
      seed ^= seed >>> 17;
      seed ^= (seed << 5) >>> 0;
      return (seed >>> 0) / 4294967296;
    };

    const anyCtx = ctx as unknown as {
      createImageData?: (w: number, h: number) => ImageData;
      putImageData?: (data: ImageData, dx: number, dy: number) => void;
    };
    if (typeof anyCtx.createImageData === 'function' && typeof anyCtx.putImageData === 'function') {
      const img = anyCtx.createImageData(size, size);
      const data = img.data;
      for (let i = 0; i < size * size; i++) {
        const o = i * 4;
        const v = rand();
        const g = Math.floor(lerp(40, 220, v));
        data[o] = g;
        data[o + 1] = g;
        data[o + 2] = g;
        data[o + 3] = 255;
      }
      anyCtx.putImageData(img, 0, 0);
    } else {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const v = rand();
          const g = Math.floor(lerp(40, 220, v));
          ctx.fillStyle = `rgb(${g}, ${g}, ${g})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    this.grainCanvas = canvas;
    this.grainKey = key;
    return canvas;
  }

  private drawFilmGrain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    rotation: number,
    mix: number,
  ) {
    const canvas = this.ensureGrainCanvas(ctx);
    if (!canvas) {
      return;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.05 + 0.02 * (1 - mix);
    const ox = Math.sin(rotation) * 10;
    const oy = Math.cos(rotation) * 10;
    const anyCtx = ctx as unknown as {
      createPattern?: (image: CanvasImageSource, repetition: string) => CanvasPattern | null;
    };
    if (typeof anyCtx.createPattern === 'function') {
      const pattern = anyCtx.createPattern(canvas, 'repeat');
      if (pattern) {
        ctx.translate(ox, oy);
        ctx.fillStyle = pattern;
        ctx.fillRect(-64, -64, width + 128, height + 128);
      }
    } else {
      const step = canvas.width || 128;
      const startX = -step + (ox % step);
      const startY = -step + (oy % step);
      for (let y = startY; y < height + step; y += step) {
        for (let x = startX; x < width + step; x += step) {
          ctx.drawImage(canvas, x, y);
        }
      }
    }
    ctx.restore();
  }

  private applyViewportFade(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    fadeX: number,
    fadeY: number,
  ) {
    const fx = clamp(fadeX, 0, w / 2);
    const fy = clamp(fadeY, 0, h / 2);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    if (fx > 0) {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      const leftT = fx / w;
      const rightT = 1 - fx / w;
      g.addColorStop(0, rgba('#000000', 0));
      g.addColorStop(leftT, rgba('#000000', 1));
      g.addColorStop(rightT, rgba('#000000', 1));
      g.addColorStop(1, rgba('#000000', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    } else {
      ctx.fillStyle = rgba('#000000', 1);
      ctx.fillRect(x, y, w, h);
    }
    if (fy > 0) {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      const topT = fy / h;
      const bottomT = 1 - fy / h;
      g.addColorStop(0, rgba('#000000', 0));
      g.addColorStop(topT, rgba('#000000', 1));
      g.addColorStop(bottomT, rgba('#000000', 1));
      g.addColorStop(1, rgba('#000000', 0));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    radius: number,
    bgTop: string,
    bgBottom: string,
  ) {
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.arcTo(width, 0, width, height, radius);
    ctx.arcTo(width, height, 0, height, radius);
    ctx.arcTo(0, height, 0, 0, radius);
    ctx.arcTo(0, 0, width, 0, radius);
    ctx.closePath();
    ctx.clip();

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, bgTop);
    gradient.addColorStop(1, bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const overlay = ctx.createLinearGradient(0, 0, 0, height);
    overlay.addColorStop(0, rgba('#ffffff', 0.26));
    overlay.addColorStop(0.6, rgba('#ffffff', 0.08));
    overlay.addColorStop(1, rgba('#ffffff', 0.02));
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, width, height);
  }

  private drawBand(
    ctx: CanvasRenderingContext2D,
    width: number,
    bandY: number,
    arcCenterX: number,
    arcCenterY: number,
    arcRadius: number,
    bandThickness: number,
    startAngle: number,
    endAngle: number,
    bgBottom: string,
  ) {
    ctx.save();
    ctx.lineCap = 'round';

    ctx.save();
    try {
      ctx.filter = 'blur(18px)';
    } catch {
      void 0;
    }
    ctx.strokeStyle = rgba('#ffffff', 0.18);
    ctx.lineWidth = bandThickness + 18;
    ctx.beginPath();
    ctx.arc(arcCenterX, arcCenterY, arcRadius, startAngle, endAngle);
    ctx.stroke();
    try {
      ctx.filter = 'none';
    } catch {
      void 0;
    }
    ctx.restore();

    const bandGradient = ctx.createLinearGradient(0, bandY - 40, width, bandY + 40);
    bandGradient.addColorStop(0, rgba('#ffffff', 0.07));
    bandGradient.addColorStop(0.5, rgba('#ffffff', 0.2));
    bandGradient.addColorStop(1, rgba('#ffffff', 0.09));
    ctx.strokeStyle = bandGradient;
    ctx.lineWidth = bandThickness;
    ctx.beginPath();
    ctx.arc(arcCenterX, arcCenterY, arcRadius, startAngle, endAngle);
    ctx.stroke();

    const fadeRadius = arcRadius * 0.52;
    const fadeSpan = 0.3;
    const fadeLeft = ctx.createRadialGradient(
      arcCenterX + Math.cos(startAngle) * arcRadius,
      arcCenterY + Math.sin(startAngle) * arcRadius,
      0,
      arcCenterX + Math.cos(startAngle) * arcRadius,
      arcCenterY + Math.sin(startAngle) * arcRadius,
      fadeRadius,
    );
    fadeLeft.addColorStop(0, rgba(bgBottom, 0.82));
    fadeLeft.addColorStop(1, rgba(bgBottom, 0));
    ctx.strokeStyle = fadeLeft;
    ctx.lineWidth = bandThickness + 2;
    ctx.beginPath();
    ctx.arc(arcCenterX, arcCenterY, arcRadius, startAngle, startAngle + fadeSpan);
    ctx.stroke();

    const fadeRight = ctx.createRadialGradient(
      arcCenterX + Math.cos(endAngle) * arcRadius,
      arcCenterY + Math.sin(endAngle) * arcRadius,
      0,
      arcCenterX + Math.cos(endAngle) * arcRadius,
      arcCenterY + Math.sin(endAngle) * arcRadius,
      fadeRadius,
    );
    fadeRight.addColorStop(0, rgba(bgBottom, 0.82));
    fadeRight.addColorStop(1, rgba(bgBottom, 0));
    ctx.strokeStyle = fadeRight;
    ctx.lineWidth = bandThickness + 2;
    ctx.beginPath();
    ctx.arc(arcCenterX, arcCenterY, arcRadius, endAngle - fadeSpan, endAngle);
    ctx.stroke();

    ctx.restore();
  }

  private drawWheelTextLayer(
    ctx: CanvasRenderingContext2D,
    arcCenterX: number,
    arcCenterY: number,
    arcRadius: number,
    bandThickness: number,
    startAngle: number,
    endAngle: number,
    scale: { segmentCount: number; selectedIndex: number; days: number[]; weekdays: string[] },
    rotation: number,
    textPrimary: string,
    textSecondary: string,
    drawWeek: boolean,
  ) {
    const segmentCount = scale.segmentCount;
    const baseAngle = -Math.PI / 2;
    const angleStep = this.getVisualAngleStep(segmentCount);
    const arcStart = normalizeAngle(startAngle);
    const arcEnd = normalizeAngle(endAngle);
    const edgeSpan = 0.24;

    const dense = segmentCount > 10;
    const weekFont = dense ? '700 15px sans-serif' : '700 17px sans-serif';
    const dayFontSize = dense ? 18 : 24;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const highlightAngle = (startAngle + endAngle) / 2;
    const range = angleStep * 3.4;

    const selectedIndex = scale.selectedIndex;
    const visibleSide = 3;
    for (let i = 0; i < segmentCount; i++) {
      if (segmentCount >= visibleSide * 2 + 1 && Math.abs(i - selectedIndex) > visibleSide) {
        continue;
      }
      const a = baseAngle + i * angleStep + rotation;
      const aN = normalizeAngle(a);
      if (aN < arcStart || aN > arcEnd) {
        continue;
      }
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const px = arcCenterX + cosA * arcRadius;
      const py = arcCenterY + sinA * arcRadius;

      const distSteps = Math.abs(shortestAngleDiff(a, highlightAngle)) / angleStep;
      const fadeCenter = clamp(1 - distSteps * (dense ? 0.06 : 0.14), 0.24, 1);
      const edgeT = Math.min((aN - arcStart) / edgeSpan, (arcEnd - aN) / edgeSpan);
      const edgeFade = clamp(edgeT, 0, 1);
      const edgeSmooth = edgeFade * edgeFade * (3 - 2 * edgeFade);
      const fade = fadeCenter * edgeSmooth;

      const d = Math.abs(shortestAngleDiff(a, highlightAngle));
      const t = clamp(1 - d / range, 0, 1);
      const scaleUp = 1 + 0.24 * (t * t * (3 - 2 * t));
      const tilt = shortestAngleDiff(a, highlightAngle) * 0.45;

      const itemWeek = scale.weekdays[i] ?? '';
      const itemDay = scale.days[i] ?? i + 1;

      if (drawWeek) {
        ctx.fillStyle = rgba(textPrimary, fade * 0.78);
        ctx.font = weekFont;
        ctx.fillText(itemWeek, px, py - bandThickness * 0.96);
      }

      ctx.save();
      ctx.translate(px, py + bandThickness * 0.02);
      ctx.rotate(tilt);
      ctx.scale(scaleUp, scaleUp);
      ctx.fillStyle = rgba(textSecondary, fade * 0.92);
      ctx.font = `700 ${Math.round(dayFontSize)}px sans-serif`;
      ctx.fillText(String(itemDay), 0, 0);
      ctx.restore();
    }
  }

  private drawMagnifier(
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    cx: number,
    cy: number,
    r: number,
    scale: number,
    fill: string,
    glow: string,
  ) {
    const tau = Math.PI * 2;
    ctx.save();
    try {
      ctx.filter = 'blur(12px)';
    } catch {
      void 0;
    }
    ctx.fillStyle = rgba(glow, 0.46);
    ctx.beginPath();
    ctx.arc(cx, cy, r + 7, 0, tau);
    ctx.fill();
    try {
      ctx.filter = 'none';
    } catch {
      void 0;
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, tau);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, tau);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = 0.96;
    ctx.drawImage(source, 0, 0);
    ctx.restore();

    ctx.strokeStyle = rgba('#ffffff', 0.42);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, tau);
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba('#ff4dd8', 0.14);
    ctx.beginPath();
    ctx.arc(cx - 0.45, cy, r + 2.2, 0, tau);
    ctx.stroke();
    ctx.strokeStyle = rgba('#2de2ff', 0.14);
    ctx.beginPath();
    ctx.arc(cx + 0.45, cy, r + 2.2, 0, tau);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

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
        borderRadius: Math.min(26, height * 0.12),
      });
      return;
    }

    const radius = Math.min(26, height * 0.12);
    const mix = clamp(this.weatherThemeT, 0, 1);
    const palette = this.getPalette(this.weatherThemeFrom, this.weatherThemeTo, mix);
    const bgTop = palette.bgTop;
    const bgBottom = palette.bgBottom;
    const textPrimary = palette.textPrimary;
    const textSecondary = palette.textSecondary;
    ctx.save();
    this.drawBackground(ctx, width, height, radius, bgTop, bgBottom);

    // 以更大的圆弧半径生成更平缓的弧带，并在红框 viewport 内做裁剪与边缘渐隐
    const scale = this.getScale();
    const segmentCount = scale.segmentCount;
    const selectedIndex = scale.selectedIndex;

    const arcCenterX = width / 2;
    const arcRadius = width * 1.72;
    const bandYOffset = clamp(height * 0.04, 10, 18);
    const bandY = height * 0.575 + bandYOffset;
    const arcCenterY = bandY + arcRadius;
    const bandThickness = clamp(height * 0.18, 52, 74) * 1.2;
    const startAngle = Math.PI * 1.04;
    const endAngle = Math.PI * 1.96;
    const highlightAngle = (startAngle + endAngle) / 2;

    const highlightX = arcCenterX + Math.cos(highlightAngle) * arcRadius;
    const highlightY = arcCenterY + Math.sin(highlightAngle) * arcRadius;
    const highlightR = clamp(bandThickness * 0.38, 18, 26);
    const lensCy = highlightY + bandThickness * 0.02;
    const highlightFill = sampleDiagonalGradientColor(
      width,
      height,
      highlightX,
      lensCy,
      bgTop,
      bgBottom,
    );
    const highlightGlow = palette.accent;

    const angleStep = this.getVisualAngleStep(segmentCount);
    const baseAngle = -Math.PI / 2;
    const wheelKey = `${segmentCount}:${this.timelineStartTime}:${selectedIndex}`;
    const targetRotation = highlightAngle - (baseAngle + selectedIndex * angleStep);
    if (!this.wheelRotationKey) {
      this.wheelRotationKey = wheelKey;
      this.wheelRotation = targetRotation;
    } else if (this.wheelRotationKey !== wheelKey) {
      this.animateWheelRotationTo(targetRotation, wheelKey);
    }
    const rotation = this.wheelRotation + this.wheelSpinOffset;
    this.drawFilmGrain(ctx, width, height, rotation, mix);
    this.textLayer = this.ensureLayer(ctx, this.textLayer, width, height);
    this.lensLayer = this.ensureLayer(ctx, this.lensLayer, width, height);
    this.wheelLayer = this.ensureLayer(ctx, this.wheelLayer, width, height);

    if (this.textLayer && this.lensLayer && this.wheelLayer) {
      // wheelLayer：圆弧带 + 日期文字 + 放大镜都画在同一离屏层，再整体按 viewport 渐隐并回贴到主画布
      const desiredPadX = 24;
      const viewportX = clamp(desiredPadX, radius + 6, width / 2 - 1);
      const viewportW = Math.max(1, width - viewportX * 2);
      const viewportY = clamp(bandY - bandThickness * 1.32, radius + 6, height - radius - 6);
      const viewportH = clamp(bandThickness * 2.24, 120, height - viewportY - radius - 6);

      const wCtx = this.wheelLayer.ctx;
      wCtx.clearRect(0, 0, this.wheelLayer.canvas.width, this.wheelLayer.canvas.height);
      wCtx.save();
      wCtx.beginPath();
      wCtx.rect(viewportX, viewportY, viewportW, viewportH);
      wCtx.clip();

      this.drawBand(
        wCtx,
        width,
        bandY,
        arcCenterX,
        arcCenterY,
        arcRadius,
        bandThickness,
        startAngle,
        endAngle,
        bgBottom,
      );

      const tCtx = this.textLayer.ctx;
      tCtx.clearRect(0, 0, this.textLayer.canvas.width, this.textLayer.canvas.height);
      this.drawWheelTextLayer(
        tCtx,
        arcCenterX,
        arcCenterY,
        arcRadius,
        bandThickness,
        startAngle,
        endAngle,
        scale,
        rotation,
        textPrimary,
        textSecondary,
        true,
      );
      wCtx.drawImage(this.textLayer.canvas, 0, 0);

      const lCtx = this.lensLayer.ctx;
      lCtx.clearRect(0, 0, this.lensLayer.canvas.width, this.lensLayer.canvas.height);
      this.drawWheelTextLayer(
        lCtx,
        arcCenterX,
        arcCenterY,
        arcRadius,
        bandThickness,
        startAngle,
        endAngle,
        scale,
        rotation,
        '#ffffff',
        '#ffffff',
        false,
      );
      this.drawMagnifier(
        wCtx,
        this.lensLayer.canvas,
        highlightX,
        lensCy,
        highlightR,
        1.55,
        highlightFill,
        highlightGlow,
      );

      const fadeX = clamp(viewportW * 0.12, 22, 56);
      const fadeY = clamp(viewportH * 0.12, 10, 32);
      this.applyViewportFade(wCtx, viewportX, viewportY, viewportW, viewportH, fadeX, fadeY);
      wCtx.restore();
      ctx.drawImage(this.wheelLayer.canvas, 0, 0);
    } else {
      this.drawBand(
        ctx,
        width,
        bandY,
        arcCenterX,
        arcCenterY,
        arcRadius,
        bandThickness,
        startAngle,
        endAngle,
        bgBottom,
      );
      this.drawWheelTextLayer(
        ctx,
        arcCenterX,
        arcCenterY,
        arcRadius,
        bandThickness,
        startAngle,
        endAngle,
        scale,
        rotation,
        textPrimary,
        textSecondary,
        true,
      );
      ctx.fillStyle = highlightFill;
      ctx.beginPath();
      ctx.arc(highlightX, lensCy, highlightR + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  dispose(): void {
    if (this.wheelRotationRaf != null) {
      cancelAnimationFrame(this.wheelRotationRaf);
      this.wheelRotationRaf = null;
    }
    if (this.wheelSpinRaf != null) {
      cancelAnimationFrame(this.wheelSpinRaf);
      this.wheelSpinRaf = null;
    }
    super.dispose();
  }
}
