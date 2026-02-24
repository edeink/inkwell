/**
 * 数学工具
 *
 * 提供基础数值裁剪能力。
 * 注意事项：用于布局与交互数值约束。
 * 潜在副作用：无。
 */
/**
 * 数值裁剪
 *
 * @param v 输入值
 * @param min 最小值
 * @param max 最大值
 * @returns 裁剪后的数值
 * @remarks
 * 注意事项：min 应小于等于 max。
 * 潜在副作用：无。
 */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
