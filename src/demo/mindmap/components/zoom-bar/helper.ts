export function quantize(value: number, min: number, max: number, step: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  const steps = Math.round((clamped - min) / step);
  const out = min + steps * step;
  return Number(out.toFixed(4));
}
