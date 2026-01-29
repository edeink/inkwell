export function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'number' && Number.isFinite(x));
}

export function formatDisplayValue(v: unknown): string {
  if (v == null) {
    return '-';
  }
  if (typeof v === 'string') {
    return v;
  }
  if (typeof v === 'number' || typeof v === 'boolean') {
    return String(v);
  }
  if (Array.isArray(v)) {
    return JSON.stringify(v);
  }
  return String(v);
}
