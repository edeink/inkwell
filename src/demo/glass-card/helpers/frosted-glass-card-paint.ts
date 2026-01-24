import type { ThemePalette } from '@/styles/theme';

import { roundedRectPath, seeded01, toSeed } from '@/demo/glass-card/helpers/canvas';

/**
 * 绘制 FrostedGlassCard 的“底图层”（可缓存复用）。
 *
 * 该层只包含“可以被磨砂/清晰窗口复用”的静态内容：
 * - 背景图（可选，cover 铺满 + 居中裁剪）
 * - 无背景图时的渐变底色 + 装饰斑点
 * - 清晰窗口的底色与渐变（用于窗口区域的清晰显示）
 */
export function renderBaseLayer(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  key: string,
  width: number,
  height: number,
  theme: ThemePalette,
  radius: number,
  windowX: number,
  windowY: number,
  windowW: number,
  windowH: number,
  windowR: number,
  bgImage: CanvasImageSource | null,
  bgImageNaturalW: number,
  bgImageNaturalH: number,
) {
  ctx.save();
  ctx.beginPath();
  roundedRectPath(ctx, 0, 0, width, height, radius);
  ctx.clip();

  // 背景图路径：优先使用真实图片，避免装饰绘制开销
  const hasBgImage = !!bgImage && bgImageNaturalW > 0 && bgImageNaturalH > 0;
  if (hasBgImage) {
    const iw = bgImageNaturalW;
    const ih = bgImageNaturalH;
    const scale = Math.max(width / iw, height / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (width - dw) / 2;
    const dy = (height - dh) / 2;
    ctx.drawImage(bgImage, dx, dy, dw, dh);
  } else {
    // 渐变底色：与主题 background.container/surface 对齐
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, theme.background.container);
    bg.addColorStop(0.55, theme.background.surface);
    bg.addColorStop(1, theme.background.container);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // 装饰斑点：使用 key 派生的伪随机序列，保证视觉稳定且可复现
    const rnd = seeded01(toSeed(key));
    const blobs = 7;
    for (let i = 0; i < blobs; i++) {
      const cx = width * (0.15 + rnd() * 0.7);
      const cy = height * (0.15 + rnd() * 0.7);
      const r = Math.min(width, height) * (0.18 + rnd() * 0.25);
      const alpha = 0.08 + rnd() * 0.08;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 2 ? theme.primary : theme.secondary;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const hasWindow = windowW > 0 && windowH > 0;
    if (hasWindow) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = theme.background.container;
      ctx.beginPath();
      roundedRectPath(ctx, windowX, windowY, windowW, windowH, windowR);
      ctx.fill();
      ctx.globalAlpha = 1;

      const winGrad = ctx.createLinearGradient(
        windowX,
        windowY,
        windowX + windowW,
        windowY + windowH,
      );
      winGrad.addColorStop(0, theme.background.surface);
      winGrad.addColorStop(1, theme.background.container);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = winGrad;
      ctx.beginPath();
      roundedRectPath(ctx, windowX, windowY, windowW, windowH, windowR);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

/**
 * 绘制磨砂覆盖层（不缓存）。
 *
 * 行为：
 * - 对“窗口外区域”做模糊覆盖（优先 ctx.filter=blur，回退为多次偏移采样）
 * - 叠加 glassAlpha 的半透明底色
 * - 可选绘制扫光高光（仅 animate=true 时）
 */
export function paintFrostedOverlay(
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  width: number,
  height: number,
  radius: number,
  windowX: number,
  windowY: number,
  windowW: number,
  windowH: number,
  windowR: number,
  baseLayerCanvas: CanvasImageSource | null,
  blurPx: number,
  glassAlpha: number,
  animate: boolean,
  timeMs: number,
) {
  ctx.save();

  const hasWindow = windowW > 0 && windowH > 0;
  ctx.beginPath();
  roundedRectPath(ctx, 0, 0, width, height, radius);
  if (hasWindow) {
    roundedRectPath(ctx, windowX, windowY, windowW, windowH, windowR);
  }
  if (hasWindow) {
    try {
      ctx.clip('evenodd');
    } catch {
      ctx.clip();
    }
  } else {
    ctx.clip();
  }

  if (baseLayerCanvas && blurPx > 0) {
    // blur 的优先路径：使用 Canvas2D filter（性能更好）
    const rawFilter = (ctx as unknown as { filter?: unknown }).filter;
    if (typeof rawFilter === 'string') {
      const prev = rawFilter;
      (ctx as unknown as { filter: string }).filter = `blur(${blurPx}px)`;
      ctx.drawImage(baseLayerCanvas, 0, 0, width, height);
      (ctx as unknown as { filter: string }).filter = prev;
    } else {
      // blur 的回退路径：通过多次小偏移采样近似模糊
      const samples = 8;
      const spread = Math.max(1, blurPx * 0.25);
      ctx.globalAlpha = 1 / (samples * 2 + 1);
      for (let i = -samples; i <= samples; i++) {
        const dx = i * spread;
        ctx.drawImage(baseLayerCanvas, dx, 0, width, height);
      }
      ctx.globalAlpha = 1;
    }
  }

  // 玻璃覆盖层：用主题底色做轻微“雾化”
  ctx.globalAlpha = glassAlpha;
  ctx.fillStyle = theme.background.container;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  // 动画扫光：仅在 animate=true 时绘制，避免静态卡片的额外填充开销
  if (animate) {
    const t = timeMs * 0.001;
    const sweep = (Math.sin(t * 0.9) * 0.5 + 0.5) * width;
    const g = ctx.createLinearGradient(sweep - width * 0.6, 0, sweep + width * 0.6, height);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  // 外描边：帮助玻璃层与背景分离
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = theme.border.base;
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundedRectPath(ctx, 0.5, 0.5, width - 1, height - 1, radius);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/**
 * 绘制清晰窗口内容（不模糊）。
 * 直接把 baseLayer 在窗口区域裁剪后绘制一遍。
 */
export function paintClearWindow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  windowX: number,
  windowY: number,
  windowW: number,
  windowH: number,
  windowR: number,
  baseLayerCanvas: CanvasImageSource | null,
) {
  if (!baseLayerCanvas || windowW <= 0 || windowH <= 0) {
    return;
  }
  ctx.save();
  ctx.beginPath();
  roundedRectPath(ctx, windowX, windowY, windowW, windowH, windowR);
  ctx.clip();
  ctx.drawImage(baseLayerCanvas, 0, 0, width, height);
  ctx.restore();
}

/**
 * 绘制窗口边框描边，用于强调“清晰窗口”的边界。
 */
export function paintWindowFrame(
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  windowX: number,
  windowY: number,
  windowW: number,
  windowH: number,
  windowR: number,
) {
  if (windowW <= 0 || windowH <= 0) {
    return;
  }
  ctx.save();

  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = theme.border.base;
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundedRectPath(ctx, windowX + 0.5, windowY + 0.5, windowW - 1, windowH - 1, windowR);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}
