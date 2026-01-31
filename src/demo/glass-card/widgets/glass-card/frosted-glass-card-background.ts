type BackgroundHost = {
  backgroundImageSrc?: string;
  bgImage: HTMLImageElement | null;
  bgImageLoaded: boolean;
  bgImageNaturalW: number;
  bgImageNaturalH: number;
  bgImageVersion: number;
  renderObject: { size: { width: number; height: number } };
  isDisposed(): boolean;
  markNeedsPaint(): void;
  updateStaticCaches(width: number, height: number): void;
  updateSuggestedTextStyle(
    width: number,
    height: number,
    options?: { forceThemeFallback?: boolean },
  ): void;
};

/**
 * @description 同步背景图资源：src 变化时创建新 Image 并异步加载；加载完成后刷新缓存并触发重绘。
 * @param host FrostedGlassCard 实例（或等价宿主）
 * @param src 背景图片地址
 * @returns void
 * @example
 * ```ts
 * // 由 FrostedGlassCard 内部调用：外部通常不需要直接使用
 * ```
 */
export function syncBackgroundImage(host: BackgroundHost, src: string | undefined) {
  const next = typeof src === 'string' && src.trim().length > 0 ? src : undefined;
  if (next === host.backgroundImageSrc) {
    return;
  }

  host.backgroundImageSrc = next;
  host.bgImageLoaded = false;
  host.bgImageNaturalW = 0;
  host.bgImageNaturalH = 0;
  host.bgImageVersion += 1;

  if (!next) {
    host.bgImage = null;
    host.markNeedsPaint();
    return;
  }

  if (typeof Image === 'undefined') {
    host.bgImage = null;
    host.markNeedsPaint();
    return;
  }

  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    if (host.isDisposed()) {
      return;
    }
    if (host.backgroundImageSrc !== next) {
      return;
    }

    host.bgImageLoaded = true;
    host.bgImageNaturalW = img.naturalWidth || 0;
    host.bgImageNaturalH = img.naturalHeight || 0;
    host.bgImageVersion += 1;

    const { width, height } = host.renderObject.size;
    if (width > 0 && height > 0) {
      host.updateStaticCaches(width, height);
      host.updateSuggestedTextStyle(width, height);
    }
    host.markNeedsPaint();
  };
  img.onerror = () => {
    if (host.isDisposed()) {
      return;
    }
    if (host.backgroundImageSrc !== next) {
      return;
    }

    host.bgImage = null;
    host.bgImageLoaded = false;
    host.bgImageNaturalW = 0;
    host.bgImageNaturalH = 0;
    host.bgImageVersion += 1;

    const { width, height } = host.renderObject.size;
    if (width > 0 && height > 0) {
      host.updateStaticCaches(width, height);
      host.updateSuggestedTextStyle(width, height, { forceThemeFallback: true });
    }
    host.markNeedsPaint();
  };

  img.src = next;
  host.bgImage = img;
  host.markNeedsPaint();
}
