/**
 * Canvas2D filter 读写辅助：
 * - 在部分环境里 filter 可能不是 string，这里保持安全检查
 * - setCanvasFilter 返回是否真的设置成功，便于调用方恢复
 */
export const readCanvasFilter = (ctx: CanvasRenderingContext2D) =>
  (ctx as unknown as { filter?: unknown }).filter;

export const setCanvasFilter = (
  ctx: CanvasRenderingContext2D,
  rawFilter: unknown,
  value: string | null,
): boolean => {
  if (typeof rawFilter !== 'string') {
    return false;
  }
  (ctx as unknown as { filter: string }).filter = value === null ? rawFilter : value;
  return true;
};
