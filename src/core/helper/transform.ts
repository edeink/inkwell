import type { IRenderer } from '@/renderer/IRenderer';

export type TransformStep =
  | { t: 'translate'; x: number; y: number }
  | { t: 'scale'; sx: number; sy: number }
  | { t: 'rotate'; rad: number };

export const IDENTITY_MATRIX: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];

export function composeSteps(
  steps: TransformStep[],
): [number, number, number, number, number, number] {
  let m = IDENTITY_MATRIX;
  for (const s of steps) {
    if (s.t === 'translate') {
      m = multiply(m, [1, 0, 0, 1, s.x, s.y]);
    } else if (s.t === 'scale') {
      m = multiply(m, [s.sx, 0, 0, s.sy, 0, 0]);
    } else if (s.t === 'rotate') {
      const c = Math.cos(s.rad);
      const g = Math.sin(s.rad);
      m = multiply(m, [c, g, -g, c, 0, 0]);
    }
  }
  return m;
}

export function multiply(
  a: [number, number, number, number, number, number],
  b: [number, number, number, number, number, number],
): [number, number, number, number, number, number] {
  const a0 = a[0],
    a1 = a[1],
    a2 = a[2],
    a3 = a[3],
    a4 = a[4],
    a5 = a[5];
  const b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3],
    b4 = b[4],
    b5 = b[5];
  return [
    a0 * b0 + a2 * b1,
    a1 * b0 + a3 * b1,
    a0 * b2 + a2 * b3,
    a1 * b2 + a3 * b3,
    a0 * b4 + a2 * b5 + a4,
    a1 * b4 + a3 * b5 + a5,
  ];
}

export function applySteps(renderer: IRenderer, steps: TransformStep[]): void {
  for (const s of steps) {
    if (s.t === 'translate') {
      renderer.translate(s.x, s.y);
    } else if (s.t === 'scale') {
      renderer.scale(s.sx, s.sy);
    } else if (s.t === 'rotate') {
      renderer.rotate(s.rad);
    }
  }
}
