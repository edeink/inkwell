/**
 * 获取当前主题下的 CSS 变量值
 * @param variable CSS 变量名 (e.g. '--ink-demo-primary')
 * @returns 变量值 (hex color)
 */
export function getThemeColor(variable: string): string {
  if (typeof window === 'undefined') {
    return '#000000';
  }
  // 获取计算后的样式
  const val = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  if (!val) {
    // Fallback if variable not found
    return '#888888';
  }
  return val;
}
