/**
 * 通用格式化工具
 *
 * 提供类型判断与展示值格式化能力。
 * 注意事项：用于 UI 展示的轻量格式化。
 * 潜在副作用：无。
 */

/**
 * 判断是否为数字数组
 *
 * @param v 输入值
 * @returns 是否为有限数字数组
 * @remarks
 * 注意事项：仅接受 number 且需有限值。
 * 潜在副作用：无。
 */
export function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'number' && Number.isFinite(x));
}

/**
 * 将任意值转为可展示文本
 *
 * @param v 输入值
 * @returns 展示文本
 * @remarks
 * 注意事项：数组会被 JSON 序列化。
 * 潜在副作用：无。
 */
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
