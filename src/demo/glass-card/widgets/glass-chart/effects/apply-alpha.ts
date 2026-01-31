import { applyAlpha as applyAlphaRaw } from '@/core/helper/color';

/**
 * applyAlpha 的轻量缓存：
 * - 渐变/阴影会高频调用，缓存可降低字符串分配与颜色解析开销
 * - 可通过全局开关 __INKWELL_DISABLE_APPLY_ALPHA_CACHE__ 禁用（便于排查问题）
 */
const alphaCache = new Map<string, Array<string | undefined>>();

export const applyAlpha = (color: string, alpha: number): string => {
  const g = globalThis as unknown as { __INKWELL_DISABLE_APPLY_ALPHA_CACHE__?: boolean };
  if (g.__INKWELL_DISABLE_APPLY_ALPHA_CACHE__ === true) {
    return applyAlphaRaw(color, alpha);
  }

  const s = (color || '').trim();
  const a = alpha <= 0 ? 0 : alpha >= 1 ? 1 : alpha;
  const alphaKey = ((a * 1000 + 0.5) | 0) as number;
  if (
    alphaKey === 1000 &&
    s &&
    ((s[0] === '#' && (s.length === 4 || s.length === 7)) || s.startsWith('rgb('))
  ) {
    return s;
  }

  let cachedByColor = alphaCache.get(s);
  if (!cachedByColor) {
    cachedByColor = [];
    alphaCache.set(s, cachedByColor);
  }
  const cached = cachedByColor[alphaKey];
  if (cached !== undefined) {
    return cached;
  }
  const computed = applyAlphaRaw(s, a);
  cachedByColor[alphaKey] = computed;
  return computed;
};
