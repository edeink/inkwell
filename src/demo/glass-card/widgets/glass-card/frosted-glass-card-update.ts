import type { FrostedGlassCardProps } from './glass-card-types';

/**
 * @description 判断 windowRect 是否发生变化（用于决定是否重建底图缓存与重采样）。
 * @param a 上一次 windowRect
 * @param b 本次 windowRect
 * @returns 是否相同
 * @example
 * ```ts
 * // 由 FrostedGlassCard 内部调用：外部通常不需要直接使用
 * ```
 */
export function isSameWindowRect(
  a: FrostedGlassCardProps['windowRect'] | undefined,
  b: FrostedGlassCardProps['windowRect'] | undefined,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    (a.radius ?? null) === (b.radius ?? null)
  );
}

/**
 * @description 判断 textSampleRect 是否发生变化（用于决定是否重采样建议文字样式）。
 * @param a 上一次采样矩形
 * @param b 本次采样矩形
 * @returns 是否相同
 * @example
 * ```ts
 * // 由 FrostedGlassCard 内部调用：外部通常不需要直接使用
 * ```
 */
export function isSameRect(
  a: FrostedGlassCardProps['textSampleRect'] | undefined,
  b: FrostedGlassCardProps['textSampleRect'] | undefined,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

type UpdateHost = {
  data: FrostedGlassCardProps;
  renderObject: { size: { width: number; height: number } };
  cachedSuggestedTextStyleSampleKey: string;
  cachedSuggestedTextStyle: { fill: string; stroke: string } | null;
  lastSuggestedTextStyleKey: string;
  markNeedsLayout(): void;
  markNeedsPaint(): void;
  updateStaticCaches(width: number, height: number): void;
  updateSuggestedTextStyle(width: number, height: number): void;
};

/**
 * @description FrostedGlassCard 的更新策略：按“布局/底图缓存/采样/绘制”分层决策，避免无意义的重算。
 * @param host FrostedGlassCard 实例（或等价宿主）
 * @param oldProps 上一次 props
 * @returns void
 * @example
 * ```ts
 * // 由框架生命周期调用：外部通常不需要直接使用
 * ```
 */
export function didUpdateFrostedGlassCard(host: UpdateHost, oldProps: FrostedGlassCardProps): void {
  const next = host.data;
  const sizeRelatedChanged = oldProps.width !== next.width || oldProps.height !== next.height;

  const themeChanged = oldProps.theme !== next.theme;
  const blurChanged = oldProps.blurPx !== next.blurPx;
  const glassAlphaChanged = oldProps.glassAlpha !== next.glassAlpha;
  const animateChanged = oldProps.animate !== next.animate;

  const windowRatioChanged = oldProps.windowRatio !== next.windowRatio;
  const windowRectChanged = !isSameWindowRect(oldProps.windowRect, next.windowRect);

  const sampleRectChanged = !isSameRect(oldProps.textSampleRect, next.textSampleRect);
  const suggestedCbChanged =
    oldProps.onSuggestedTextStyleChange !== next.onSuggestedTextStyleChange;

  const bgChanged = oldProps.backgroundImageSrc !== next.backgroundImageSrc;

  if (sizeRelatedChanged) {
    host.markNeedsLayout();
    return;
  }

  const baseLayerRelatedChanged =
    themeChanged || windowRatioChanged || windowRectChanged || bgChanged;
  const samplingRelatedChanged = baseLayerRelatedChanged || sampleRectChanged || suggestedCbChanged;
  if (samplingRelatedChanged) {
    host.cachedSuggestedTextStyleSampleKey = '';
    host.cachedSuggestedTextStyle = null;
    if (suggestedCbChanged) {
      host.lastSuggestedTextStyleKey = '';
    }
  }

  const { width, height } = host.renderObject.size;
  if (baseLayerRelatedChanged && width > 0 && height > 0) {
    host.updateStaticCaches(width, height);
  }
  if (samplingRelatedChanged && width > 0 && height > 0) {
    host.updateSuggestedTextStyle(width, height);
  }

  const paintRelatedChanged =
    blurChanged ||
    glassAlphaChanged ||
    animateChanged ||
    baseLayerRelatedChanged ||
    sampleRectChanged ||
    suggestedCbChanged;
  if (paintRelatedChanged) {
    host.markNeedsPaint();
  }
}
