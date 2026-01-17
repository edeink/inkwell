/**
 * 行内渲染工具函数。
 *
 * 目前仅提供 `ensureKey`：把可选的 key 规整为字符串，避免在不同渲染路径中
 * 出现 key 类型不一致导致的 diff 不稳定。
 *
 * @example
 * ```ts
 * const key = ensureKey(ctx.widgetKey);
 * return <Text key={key} ... />
 * ```
 */
export function ensureKey(ctxKey?: string | number | null) {
  if (ctxKey === undefined || ctxKey === null) {
    return undefined;
  }
  return String(ctxKey);
}
