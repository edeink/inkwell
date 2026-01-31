import { clamp } from './glass-card-utils';

import type { BoxConstraints } from '@/core/base';

type LayoutHost = {
  cardW?: number;
  cardH?: number;
  updateStaticCaches(width: number, height: number): void;
};

/**
 * @description 根据约束与期望尺寸，计算 FrostedGlassCard 的布局尺寸，并在尺寸有效时刷新静态缓存。
 * @param host FrostedGlassCard 实例（或等价宿主）
 * @param constraints 布局约束
 * @returns 计算得到的宽高
 * @example
 * ```ts
 * // 由框架布局生命周期调用：外部通常不需要直接使用
 * ```
 */
export function layoutFrostedGlassCard(
  host: LayoutHost,
  constraints: BoxConstraints,
): { width: number; height: number } {
  const maxW = Number.isFinite(constraints.maxWidth) ? constraints.maxWidth : 360;
  const maxH = Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : 240;
  const minW = Number.isFinite(constraints.minWidth) ? constraints.minWidth : 0;
  const minH = Number.isFinite(constraints.minHeight) ? constraints.minHeight : 0;

  const w0 = typeof host.cardW === 'number' ? host.cardW : Math.min(520, maxW);
  const h0 =
    typeof host.cardH === 'number' ? host.cardH : Math.min(320, maxH, Math.max(180, w0 * 0.58));

  const width = clamp(w0, minW, maxW);
  const height = clamp(h0, minH, maxH);
  if (width > 0 && height > 0) {
    host.updateStaticCaches(width, height);
  }
  return { width, height };
}
