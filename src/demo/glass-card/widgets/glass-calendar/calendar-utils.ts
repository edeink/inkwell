export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  const p = 1 - t;
  return 1 - p * p * p;
}

export function startOfDay(d: Date): Date {
  const nd = new Date(d.getTime());
  nd.setHours(0, 0, 0, 0);
  return nd;
}

export function addDays(d: Date, delta: number): Date {
  const nd = startOfDay(d);
  nd.setDate(nd.getDate() + delta);
  return nd;
}

export function normalizeAngle(a: number): number {
  const tau = Math.PI * 2;
  let v = a % tau;
  if (v < 0) {
    v += tau;
  }
  return v;
}

export function shortestAngleDiff(a: number, b: number): number {
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

export function parseHex(hex: string): { r: number; g: number; b: number } {
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

export function parseColor(raw: string): { r: number; g: number; b: number } {
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

export function mixRgb(a: string, b: string, t: number): string {
  const c1 = parseColor(a);
  const c2 = parseColor(b);
  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b2 = Math.round(lerp(c1.b, c2.b, t));
  return `rgb(${r}, ${g}, ${b2})`;
}

export function rgba(hex: string, alpha: number): string {
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

export function sampleDiagonalGradientColor(
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
