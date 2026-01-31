/**
 * 将数值夹紧到 [0, 1] 区间，避免分支抖动与 NaN 扩散。
 */
export const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
