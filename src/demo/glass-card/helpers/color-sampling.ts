/**
 * 采样得到的 RGBA（a 为 0~1）。
 * 注意：r/g/b 这里允许为浮点数（用于做加权平均），但 fast 版本会返回整数通道值。
 */
export type RGBA = { r: number; g: number; b: number; a: number };

/**
 * 1x1 采样器：用于将任意区域缩放到 1x1 后读取像素，避免大范围 getImageData。
 * 该对象会被复用，避免重复创建 canvas/context 带来的分配成本。
 */
let avgSampler: {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D;
} | null = null;

function ensureAvgSampler() {
  if (avgSampler) {
    return avgSampler;
  }
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(1, 1)
      : (document.createElement('canvas') as HTMLCanvasElement);
  const ctx =
    typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas
      ? canvas.getContext('2d')
      : (canvas as HTMLCanvasElement).getContext('2d');
  if (!ctx) {
    return null;
  }
  avgSampler = { canvas, ctx: ctx as unknown as CanvasRenderingContext2D };
  return avgSampler;
}

/**
 * 快速估算区域平均颜色（优先路径）。
 *
 * 原理：将目标区域 drawImage 到 1x1，再读取该像素。
 * 约束：当 source 不支持裁剪/跨域污染等情况时，可能抛错或返回 null。
 */
export function averageRegionRGBAFast(
  source: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
): RGBA | null {
  const w = Math.max(0, Math.floor(width));
  const h = Math.max(0, Math.floor(height));
  if (w <= 0 || h <= 0) {
    return null;
  }

  const sampler = ensureAvgSampler();
  if (!sampler) {
    return null;
  }

  if (sampler.canvas.width !== 1) {
    sampler.canvas.width = 1;
  }
  if (sampler.canvas.height !== 1) {
    sampler.canvas.height = 1;
  }

  const readX = Math.max(0, Math.floor(x));
  const readY = Math.max(0, Math.floor(y));

  const ctx = sampler.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, 1, 1);
  ctx.imageSmoothingEnabled = true;
  try {
    ctx.drawImage(source, readX, readY, w, h, 0, 0, 1, 1);
  } catch {
    return null;
  }

  let img: ImageData;
  try {
    img = ctx.getImageData(0, 0, 1, 1);
  } catch {
    return null;
  }
  const d = img.data;
  if (!d || d.length < 4) {
    return null;
  }
  return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
}

/**
 * 通过 getImageData 采样区域并做稀疏加权平均（回退路径）。
 * 为控制开销，会根据像素总数自适应 stride，最多采样约 1200 个点。
 */
export function averageRegionRGBA(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): RGBA | null {
  const w = Math.max(0, Math.floor(width));
  const h = Math.max(0, Math.floor(height));
  if (w <= 0 || h <= 0) {
    return null;
  }
  const readX = Math.max(0, Math.floor(x));
  const readY = Math.max(0, Math.floor(y));
  let img: ImageData;
  try {
    img = (ctx as CanvasRenderingContext2D).getImageData(readX, readY, w, h);
  } catch {
    return null;
  }
  const data = img.data;
  if (!data || data.length < 4) {
    return null;
  }

  const pixelCount = w * h;
  const targetSamples = 1200;
  const stride = Math.max(1, Math.floor(Math.sqrt(pixelCount / targetSamples)));
  const step = stride * 4;

  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sa = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += step) {
    const a = data[i + 3] / 255;
    if (a <= 0) {
      continue;
    }
    sr += data[i] * a;
    sg += data[i + 1] * a;
    sb += data[i + 2] * a;
    sa += a;
    n++;
  }
  if (n <= 0 || sa <= 0) {
    return null;
  }
  return { r: sr / sa, g: sg / sa, b: sb / sa, a: sa / n };
}

/**
 * 根据背景平均亮度，推荐文字 fill/stroke 组合。
 * 目标：在明暗背景上尽量保持可读性，且 stroke 颜色用于抗锯齿边缘增强。
 */
export function pickTextFillAndStroke(avg: RGBA | null): { fill: string; stroke: string } {
  if (!avg) {
    return { fill: '#ffffff', stroke: 'rgba(0,0,0,0.65)' };
  }
  const lum = (0.2126 * avg.r + 0.7152 * avg.g + 0.0722 * avg.b) / 255;
  if (lum < 0.55) {
    return { fill: '#ffffff', stroke: 'rgba(0,0,0,0.65)' };
  }
  return { fill: '#111111', stroke: 'rgba(255,255,255,0.7)' };
}

/**
 * 解析 #rgb/#rrggbb 为 RGBA（a 固定为 1）。
 * 仅支持十六进制颜色字符串，其它格式返回 null。
 */
export function parseHexColorToRGBA(color: string): RGBA | null {
  const c = color.trim();
  if (c.length === 4 && c[0] === '#') {
    const r = Number.parseInt(c[1] + c[1], 16);
    const g = Number.parseInt(c[2] + c[2], 16);
    const b = Number.parseInt(c[3] + c[3], 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return { r, g, b, a: 1 };
    }
    return null;
  }
  if (c.length === 7 && c[0] === '#') {
    const r = Number.parseInt(c.slice(1, 3), 16);
    const g = Number.parseInt(c.slice(3, 5), 16);
    const b = Number.parseInt(c.slice(5, 7), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return { r, g, b, a: 1 };
    }
    return null;
  }
  return null;
}
