import { clamp } from './glass-card-utils';

type WindowRect = { x: number; y: number; width: number; height: number; radius?: number };

type WindowLayoutHost = {
  windowDisabled: boolean;
  windowRatio: number;
  windowRect?: WindowRect;
  layoutCache: {
    layoutW: number;
    layoutH: number;
    radius: number;
    padding: number;
    windowDisabled: boolean;
    hasWindowRect: boolean;
    windowRatio: number;
    windowRectX: number;
    windowRectY: number;
    windowRectW: number;
    windowRectH: number;
    windowRectRadius: number | null;
    windowX: number;
    windowY: number;
    windowW: number;
    windowH: number;
    windowR: number;
  };
};

/**
 * @description 计算清晰窗口布局，并写回宿主的 layoutCache。
 * @param host FrostedGlassCard 实例（或等价宿主）
 * @param width 当前布局宽度
 * @param height 当前布局高度
 * @param radius 卡片圆角
 * @param padding 内容内边距
 * @returns void
 * @example
 * ```ts
 * // 由 FrostedGlassCard 内部调用：外部通常不需要直接使用
 * ```
 */
export function computeWindowLayout(
  host: WindowLayoutHost,
  width: number,
  height: number,
  radius: number,
  padding: number,
) {
  const cache = host.layoutCache;
  cache.layoutW = width;
  cache.layoutH = height;
  cache.radius = radius;
  cache.padding = padding;
  cache.windowDisabled = host.windowDisabled;

  let windowX = 0;
  let windowY = 0;
  let windowW = 0;
  let windowH = 0;
  let windowR = 0;

  if (host.windowDisabled) {
    cache.hasWindowRect = false;
    cache.windowRatio = host.windowRatio;
    cache.windowRectX = 0;
    cache.windowRectY = 0;
    cache.windowRectW = 0;
    cache.windowRectH = 0;
    cache.windowRectRadius = null;
    cache.windowX = 0;
    cache.windowY = 0;
    cache.windowW = 0;
    cache.windowH = 0;
    cache.windowR = 0;
    return;
  }

  if (host.windowRect) {
    cache.hasWindowRect = true;
    cache.windowRatio = host.windowRatio;
    cache.windowRectX = host.windowRect.x;
    cache.windowRectY = host.windowRect.y;
    cache.windowRectW = host.windowRect.width;
    cache.windowRectH = host.windowRect.height;
    cache.windowRectRadius =
      typeof host.windowRect.radius === 'number' ? host.windowRect.radius : null;

    const x = host.windowRect.x;
    const y = host.windowRect.y;
    const w = host.windowRect.width;
    const h = host.windowRect.height;

    windowW = clamp(w, 16, width);
    windowH = clamp(h, 16, height);
    windowX = clamp(x, 0, Math.max(0, width - windowW));
    windowY = clamp(y, 0, Math.max(0, height - windowH));
    const r =
      typeof host.windowRect.radius === 'number'
        ? host.windowRect.radius
        : Math.min(radius * 0.7, 14);
    windowR = clamp(r, 0, Math.min(windowW, windowH) / 2);
  } else {
    cache.hasWindowRect = false;
    cache.windowRatio = host.windowRatio;
    cache.windowRectX = 0;
    cache.windowRectY = 0;
    cache.windowRectW = 0;
    cache.windowRectH = 0;
    cache.windowRectRadius = null;

    windowW = clamp(width * host.windowRatio, 88, Math.min(180, width - padding * 2 - 40));
    windowH = clamp(height - padding * 2, 96, height - padding * 2);
    windowX = width - padding - windowW;
    windowY = (height - windowH) / 2;
    windowR = Math.min(radius * 0.7, 14);
  }

  cache.windowX = windowX;
  cache.windowY = windowY;
  cache.windowW = windowW;
  cache.windowH = windowH;
  cache.windowR = windowR;
}
