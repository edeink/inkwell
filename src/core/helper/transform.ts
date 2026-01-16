import type { IRenderer } from '@/renderer/IRenderer';

export type TransformStep =
  | { t: 'translate'; x: number; y: number }
  | { t: 'scale'; sx: number; sy: number }
  | { t: 'rotate'; rad: number };

export const IDENTITY_MATRIX: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];

export function composeSteps(
  steps: TransformStep[],
): [number, number, number, number, number, number] {
  if (steps.length === 0) {
    return IDENTITY_MATRIX;
  }
  if (steps.length === 1) {
    const s = steps[0];
    if (s.t === 'translate') {
      return [1, 0, 0, 1, s.x, s.y];
    }
    if (s.t === 'scale') {
      return [s.sx, 0, 0, s.sy, 0, 0];
    }
    const c = Math.cos(s.rad);
    const g = Math.sin(s.rad);
    return [c, g, -g, c, 0, 0];
  }
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

export function multiplyTranslate(
  m: [number, number, number, number, number, number],
  x: number,
  y: number,
): [number, number, number, number, number, number] {
  const a0 = m[0],
    a1 = m[1],
    a2 = m[2],
    a3 = m[3],
    a4 = m[4],
    a5 = m[5];
  return [a0, a1, a2, a3, a0 * x + a2 * y + a4, a1 * x + a3 * y + a5];
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

/**
 * 计算矩阵的逆矩阵
 * @param m [a, b, c, d, tx, ty]
 */
export function invert(
  m: [number, number, number, number, number, number],
): [number, number, number, number, number, number] {
  const a = m[0],
    b = m[1],
    c = m[2],
    d = m[3],
    tx = m[4],
    ty = m[5];

  const det = a * d - b * c;
  if (!det) {
    return [1, 0, 0, 1, 0, 0]; // 不可逆，返回单位矩阵
  }

  const invDet = 1 / det;

  // inv[0] = d / det
  // inv[1] = -b / det
  // inv[2] = -c / det
  // inv[3] = a / det
  // inv[4] = (c * ty - d * tx) / det
  // inv[5] = (b * tx - a * ty) / det

  return [
    d * invDet,
    -b * invDet,
    -c * invDet,
    a * invDet,
    (c * ty - d * tx) * invDet,
    (b * tx - a * ty) * invDet,
  ];
}

/**
 * 应用矩阵变换到点
 */
export function transformPoint(
  m: [number, number, number, number, number, number],
  p: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
  };
}
