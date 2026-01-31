type ScratchCanvasLike = {
  width: number;
  height: number;
  getContext: (contextId: '2d') => CanvasRenderingContext2D | null;
};

type ScratchCanvasFactory = new (width: number, height: number) => ScratchCanvasLike;

type GlobalScratch = {
  OffscreenCanvas?: ScratchCanvasFactory;
  document?: { createElement: (tag: 'canvas') => HTMLCanvasElement };
};

/**
 * Scratch 缓存：用于在离屏画布上绘制复杂效果，再一次性合成回主画布。
 */
export type ScratchCache = { canvas: unknown; ctx: CanvasRenderingContext2D; w: number; h: number };

/**
 * 获取/复用 scratch 画布：
 * - 优先 OffscreenCanvas
 * - 否则尝试复用宿主 canvas 的构造器（某些运行时支持）
 * - 最后回退到 document.createElement('canvas')
 */
export const ensureScratchCanvas = (
  prev: ScratchCache | undefined,
  hostCanvas: unknown,
  width: number,
  height: number,
): ScratchCache | null => {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (prev && prev.w === w && prev.h === h) {
    return prev;
  }

  const g = globalThis as unknown as GlobalScratch;
  let canvas: ScratchCanvasLike | HTMLCanvasElement | null = null;
  if (typeof g.OffscreenCanvas === 'function') {
    canvas = new g.OffscreenCanvas(w, h);
  } else {
    const CtorUnknown = (hostCanvas as unknown as { constructor?: unknown }).constructor;
    if (typeof CtorUnknown === 'function') {
      try {
        canvas = new (CtorUnknown as unknown as ScratchCanvasFactory)(w, h);
      } catch {
        canvas = null;
      }
    }
    if (!canvas && typeof g.document?.createElement === 'function') {
      canvas = g.document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
    }
  }
  if (!canvas) {
    return null;
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  return { canvas, ctx, w, h };
};
