/**
 * 受保护属性配置
 * 功能：维护不可编辑的属性键列表，并提供判断函数
 * 参数：k - 待判断的属性键
 * 返回：true 表示受保护（不可编辑），false 表示可编辑
 */
import { DEVTOOLS_PROP_KEYS, DEVTOOLS_PROP_PREFIX } from '../constants';

export const PROTECTED_KEYS: string[] = [DEVTOOLS_PROP_KEYS.KEY];

export function isProtectedKey(k: string): boolean {
  return PROTECTED_KEYS.includes(k);
}

export function isHiddenKey(k: string): boolean {
  return k.startsWith(DEVTOOLS_PROP_PREFIX.INTERNAL) || k === DEVTOOLS_PROP_KEYS.REF;
}
