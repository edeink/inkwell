export function parseColor(color: string): [number, number, number, number] {
  const s = (color || '').trim();
  if (!s) {
    return [0, 0, 0, 0];
  }

  if (s === 'transparent') {
    return [0, 0, 0, 0];
  }

  if (s[0] === '#') {
    if (s.length === 4) {
      const r = parseInt(s[1] + s[1], 16);
      const g = parseInt(s[2] + s[2], 16);
      const b = parseInt(s[3] + s[3], 16);
      return [r, g, b, 1];
    }
    if (s.length === 7) {
      const r = parseInt(s.slice(1, 3), 16);
      const g = parseInt(s.slice(3, 5), 16);
      const b = parseInt(s.slice(5, 7), 16);
      return [r, g, b, 1];
    }
    if (s.length === 9) {
      const r = parseInt(s.slice(1, 3), 16);
      const g = parseInt(s.slice(3, 5), 16);
      const b = parseInt(s.slice(5, 7), 16);
      const a = parseInt(s.slice(7, 9), 16) / 255;
      return [r, g, b, a];
    }
  }

  const match = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      match[4] ? parseFloat(match[4]) : 1,
    ];
  }
  return [0, 0, 0, 0];
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function colorToString(c: [number, number, number, number]): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;
}

export function lerpColor(
  current: [number, number, number, number],
  target: [number, number, number, number],
  speed: number,
): [number, number, number, number] {
  return [
    lerp(current[0], target[0], speed),
    lerp(current[1], target[1], speed),
    lerp(current[2], target[2], speed),
    lerp(current[3], target[3], speed),
  ];
}

export function isColorClose(
  a: [number, number, number, number],
  b: [number, number, number, number],
  threshold: number = 0.1,
  alphaThreshold: number = 0.005,
): boolean {
  const diff = [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
  return (
    Math.abs(diff[0]) < threshold &&
    Math.abs(diff[1]) < threshold &&
    Math.abs(diff[2]) < threshold &&
    Math.abs(diff[3]) < alphaThreshold
  );
}

export function applyAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const s = (color || '').trim();
  if (!s) {
    return `rgba(0,0,0,${a})`;
  }

  const rgba = s.match(/rgba\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgba) {
    return `rgba(${parseInt(rgba[1], 10)},${parseInt(rgba[2], 10)},${parseInt(rgba[3], 10)},${a})`;
  }
  const rgb = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgb) {
    return `rgba(${parseInt(rgb[1], 10)},${parseInt(rgb[2], 10)},${parseInt(rgb[3], 10)},${a})`;
  }

  if (s[0] === '#') {
    if (s.length === 4) {
      const r = parseInt(s[1] + s[1], 16);
      const g = parseInt(s[2] + s[2], 16);
      const b = parseInt(s[3] + s[3], 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    if (s.length === 7) {
      const r = parseInt(s.slice(1, 3), 16);
      const g = parseInt(s.slice(3, 5), 16);
      const b = parseInt(s.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    if (s.length === 9) {
      const r = parseInt(s.slice(1, 3), 16);
      const g = parseInt(s.slice(3, 5), 16);
      const b = parseInt(s.slice(5, 7), 16);
      const baseA = parseInt(s.slice(7, 9), 16) / 255;
      const outA = Math.max(0, Math.min(1, baseA * a));
      return `rgba(${r},${g},${b},${outA})`;
    }
  }

  return s;
}
