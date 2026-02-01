function normalizeHexColor(value?: string): string {
  if (!value) {
    return '#000000';
  }
  const s = String(value).trim().toLowerCase();
  const hex3 = /^#([0-9a-f]{3})$/i.exec(s);
  if (hex3) {
    const t = hex3[1];
    return `#${t[0]}${t[0]}${t[1]}${t[1]}${t[2]}${t[2]}`.toLowerCase();
  }
  const hex6 = /^#([0-9a-f]{6})$/i.exec(s);
  if (hex6) {
    return `#${hex6[1]}`.toLowerCase();
  }
  const hex8 = /^#([0-9a-f]{8})$/i.exec(s);
  if (hex8) {
    return `#${hex8[1].slice(0, 6)}`.toLowerCase();
  }
  const rgb = /^rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+\s*)?\)$/i.exec(
    s,
  );
  if (rgb) {
    const r = Math.max(0, Math.min(255, Math.round(Number(rgb[1]))));
    const g = Math.max(0, Math.min(255, Math.round(Number(rgb[2]))));
    const b = Math.max(0, Math.min(255, Math.round(Number(rgb[3]))));
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`.toLowerCase();
  }
  const hsl = /^hsl\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i.exec(s);
  if (hsl) {
    const h = Number(hsl[1]);
    const sat = Number(hsl[2]) / 100;
    const lit = Number(hsl[3]) / 100;
    const hh = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * lit - 1)) * Math.max(0, Math.min(1, sat));
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = lit - c / 2;
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;
    if (hh < 60) {
      r1 = c;
      g1 = x;
    } else if (hh < 120) {
      r1 = x;
      g1 = c;
    } else if (hh < 180) {
      g1 = c;
      b1 = x;
    } else if (hh < 240) {
      g1 = x;
      b1 = c;
    } else if (hh < 300) {
      r1 = x;
      b1 = c;
    } else {
      r1 = c;
      b1 = x;
    }
    const r = Math.max(0, Math.min(255, Math.round((r1 + m) * 255)));
    const g = Math.max(0, Math.min(255, Math.round((g1 + m) * 255)));
    const b = Math.max(0, Math.min(255, Math.round((b1 + m) * 255)));
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`.toLowerCase();
  }
  return '#000000';
}

function isHexColorText(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim());
}

export const ColorText = { normalizeHexColor, isHexColorText };
