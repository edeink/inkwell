/**
 * 属性安全配置
 *
 * 维护受保护/隐藏字段的判定规则。
 * 注意事项：规则用于属性编辑器与对象编辑器。
 * 潜在副作用：无。
 */
import { DEVTOOLS_PROP_KEYS, DEVTOOLS_PROP_PREFIX } from '../constants';

/**
 * 受保护字段列表
 *
 * 注意事项：这些字段不可编辑。
 * 潜在副作用：无。
 */
export const PROTECTED_KEYS: string[] = [DEVTOOLS_PROP_KEYS.KEY];

/**
 * 判断是否为受保护字段
 *
 * @param k 字段名
 * @returns 是否受保护
 * @remarks
 * 注意事项：受保护字段不可编辑。
 * 潜在副作用：无。
 */
export function isProtectedKey(k: string): boolean {
  return PROTECTED_KEYS.includes(k);
}

/**
 * 判断是否为隐藏字段
 *
 * @param k 字段名
 * @returns 是否隐藏
 * @remarks
 * 注意事项：隐藏字段不会出现在编辑器中。
 * 潜在副作用：无。
 */
export function isHiddenKey(k: string): boolean {
  return k.startsWith(DEVTOOLS_PROP_PREFIX.INTERNAL) || k === DEVTOOLS_PROP_KEYS.REF;
}
