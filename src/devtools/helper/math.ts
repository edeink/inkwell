/**
 * 数值约束
 * 功能：将数值限制在 [min, max] 区间内
 * 参数：v - 输入值；min - 最小值；max - 最大值
 * 返回：被约束后的数值
 */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
