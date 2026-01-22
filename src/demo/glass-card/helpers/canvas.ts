/**
 * 将任意字符串稳定映射为 uint32 的种子值。
 * 用于在不引入额外随机数源的情况下，生成可复现的伪随机序列。
 */
export function toSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 基于线性同余的伪随机生成器，返回 [0, 1) 的浮点数。
 * 约定：相同 seed 必须产生相同序列，便于稳定复现装饰图形。
 */
export function seeded01(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return (s & 0xffffffff) / 0x100000000;
  };
}

/**
 * 在当前路径上添加一个圆角矩形轮廓。
 * 优先使用原生 roundRect；否则用 arcTo 兼容实现。
 */
export function roundedRectPath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, Math.min(width, height) / 2));
  const roundRect = (
    ctx as unknown as {
      roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
    }
  ).roundRect;
  if (typeof roundRect === 'function') {
    roundRect.call(ctx as never, x, y, width, height, rr);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + width - rr, y);
  ctx.arcTo(x + width, y, x + width, y + rr, rr);
  ctx.lineTo(x + width, y + height - rr);
  ctx.arcTo(x + width, y + height, x + width - rr, y + height, rr);
  ctx.lineTo(x + rr, y + height);
  ctx.arcTo(x, y + height, x, y + height - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}
