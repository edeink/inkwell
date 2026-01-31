/**
 * @description 将数值限制在闭区间内。
 * @param v 输入值
 * @param min 最小值
 * @param max 最大值
 * @returns 截断后的数值
 * @example
 * ```ts
 * import { clamp } from '@/demo/glass-card/widgets/glass-card';
 *
 * clamp(2, 0, 1); // 1
 * ```
 */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
