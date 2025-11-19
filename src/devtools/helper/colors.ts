/**
 * 颜色字符串识别
 * 功能：判断输入是否为可识别的颜色字符串（hex、rgb(a)、hsl）
 * 参数：val - 任意类型输入值
 * 返回：true 表示是颜色字符串，false 表示不是
 */
export function isColor(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const s = val.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s)) return true;
  if (/^rgb\s*\(/.test(s)) return true;
  if (/^rgba\s*\(/.test(s)) return true;
  if (/^hsl\s*\(/.test(s)) return true;
  return false;
}