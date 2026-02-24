/**
 * 颜色识别工具
 *
 * 判断输入是否为可识别的颜色字符串。
 * 注意事项：仅支持 hex/rgb(a)/hsl 格式。
 * 潜在副作用：无。
 */
/**
 * 判断是否为颜色字符串
 *
 * @param val 输入值
 * @returns 是否为颜色字符串
 * @remarks
 * 注意事项：会先进行字符串 trim 与小写转换。
 * 潜在副作用：无。
 */
export function isColor(val: unknown): boolean {
  if (typeof val !== 'string') {
    return false;
  }
  const s = val.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s)) {
    return true;
  }
  if (/^rgb\s*\(/.test(s)) {
    return true;
  }
  if (/^rgba\s*\(/.test(s)) {
    return true;
  }
  if (/^hsl\s*\(/.test(s)) {
    return true;
  }
  return false;
}
