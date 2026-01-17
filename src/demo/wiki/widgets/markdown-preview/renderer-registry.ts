/**
 * 渲染器注册与匹配的通用工具。
 *
 * 该模块用于把“可选的外部渲染器列表”与“默认渲染器列表”合并为一条匹配链，
 * 并按顺序执行 `match -> render`，返回第一个命中的渲染结果。
 *
 * 设计约定：
 * - 外部传入的渲染器优先级更高（放在链的前面），用于覆盖默认行为。
 * - 渲染器只负责“是否命中 + 如何渲染”，链的执行由本模块统一处理。
 *
 * @example
 * ```ts
 * const chain = createRendererChain(extraRenderers, defaultRenderers);
 * const result = renderWithChain(ctx, chain);
 * ```
 */
export type RendererLike<TCtx, TResult> = {
  match: (ctx: TCtx) => boolean;
  render: (ctx: TCtx) => TResult;
};

export function createRendererChain<TRenderer>(
  extra: TRenderer[] | undefined,
  defaults: TRenderer[],
): TRenderer[] {
  if (!extra || extra.length === 0) {
    return defaults;
  }
  return [...extra, ...defaults];
}

export function renderWithChain<TCtx, TResult>(
  ctx: TCtx,
  chain: readonly RendererLike<TCtx, TResult>[],
): TResult | undefined {
  for (const r of chain) {
    if (r.match(ctx)) {
      return r.render(ctx);
    }
  }
  return undefined;
}
