import { applyAlpha } from './apply-alpha';
import { readCanvasFilter, setCanvasFilter } from './canvas-filter';
import { clipAnnulus } from './paint-groove';

import { Themes, type ThemePalette } from '@/styles/theme';

/**
 * 进度环绘制（effects）：
 * - Jelly：保留较强的体积感与氛围光
 */
export const paintProgressAtmosphere = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  rawFilter: unknown,
  cx: number,
  cy: number,
  ringR: number,
  ringW: number,
  jellyW: number,
  startA: number,
  endA: number,
) => {
  ctx.save();
  const castHadFilter = setCanvasFilter(ctx, rawFilter, `blur(${Math.max(26, jellyW * 1.55)}px)`);
  ctx.globalAlpha = theme === Themes.dark ? 0.09 : 0.08;
  ctx.strokeStyle = applyAlpha('#2eea68', 1);
  ctx.lineWidth = ringW * 1.55;
  ctx.lineCap = 'round';
  ctx.translate(-jellyW * 0.08, jellyW * 0.03);
  ctx.beginPath();
  ctx.arc(cx, cy, ringR - ringW * 0.02, startA, endA);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (castHadFilter) {
    setCanvasFilter(ctx, rawFilter, null);
  }
  ctx.restore();

  ctx.save();
  const shadowHadFilter = setCanvasFilter(ctx, rawFilter, `blur(${Math.max(14, jellyW * 0.82)}px)`);
  ctx.globalAlpha = theme === Themes.dark ? 0.14 : 0.08;
  ctx.strokeStyle = applyAlpha('#000000', 1);
  ctx.lineWidth = jellyW * 1.12;
  ctx.lineCap = 'round';
  ctx.translate(-jellyW * 0.14, jellyW * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, ringR + jellyW * 0.06, startA, endA);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (shadowHadFilter) {
    setCanvasFilter(ctx, rawFilter, null);
  }
  ctx.restore();

  const spillSoft =
    theme === Themes.dark ? applyAlpha('#7cff9d', 0.12) : applyAlpha('#6dff95', 0.14);
  const spillStrong =
    theme === Themes.dark ? applyAlpha('#29ea66', 0.18) : applyAlpha('#21e35e', 0.16);
  ctx.save();
  const glowHadFilter = setCanvasFilter(ctx, rawFilter, `blur(${Math.max(22, jellyW * 1.28)}px)`);
  ctx.lineCap = 'round';
  ctx.globalAlpha = theme === Themes.dark ? 0.14 : 0.1;
  ctx.strokeStyle = spillSoft;
  ctx.lineWidth = jellyW * 2.35;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, startA, endA);
  ctx.stroke();
  ctx.globalAlpha = theme === Themes.dark ? 0.12 : 0.08;
  ctx.strokeStyle = spillStrong;
  ctx.lineWidth = jellyW * 1.85;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, startA, endA);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (glowHadFilter) {
    setCanvasFilter(ctx, rawFilter, null);
  }
  ctx.restore();
};

const createProgressBodyGradient = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  cx: number,
  cy: number,
  ringR: number,
  jellyW: number,
) => {
  const body = ctx.createRadialGradient(
    cx,
    cy,
    Math.max(1, ringR - jellyW * 0.72),
    cx,
    cy,
    ringR + jellyW * 0.72,
  );
  body.addColorStop(0, applyAlpha('#0e7f33', 0));
  body.addColorStop(0.08, applyAlpha('#0e7f33', theme === Themes.dark ? 0.62 : 0.58));
  body.addColorStop(0.12, applyAlpha('#0e7f33', theme === Themes.dark ? 0.78 : 0.74));
  body.addColorStop(0.16, applyAlpha('#0e7f33', theme === Themes.dark ? 0.86 : 0.82));
  body.addColorStop(0.2, applyAlpha('#0e7f33', theme === Themes.dark ? 0.9 : 0.86));
  body.addColorStop(0.25, applyAlpha('#0f8f3a', theme === Themes.dark ? 0.92 : 0.9));
  body.addColorStop(0.3, applyAlpha('#11a343', theme === Themes.dark ? 0.96 : 0.94));
  body.addColorStop(0.36, applyAlpha('#11a343', theme === Themes.dark ? 0.97 : 0.95));
  body.addColorStop(0.42, applyAlpha('#11a343', theme === Themes.dark ? 0.98 : 0.96));
  body.addColorStop(0.48, applyAlpha('#14b34b', theme === Themes.dark ? 0.99 : 0.98));
  body.addColorStop(0.52, applyAlpha('#18c255', 1));
  body.addColorStop(
    0.56,
    applyAlpha(theme === Themes.dark ? '#1fda5e' : '#1fd45b', theme === Themes.dark ? 0.99 : 0.97),
  );
  body.addColorStop(
    0.6,
    applyAlpha(theme === Themes.dark ? '#2eea68' : '#25e061', theme === Themes.dark ? 0.97 : 0.95),
  );
  body.addColorStop(
    0.64,
    applyAlpha(theme === Themes.dark ? '#2eea68' : '#25e061', theme === Themes.dark ? 0.95 : 0.93),
  );
  body.addColorStop(
    0.7,
    applyAlpha(theme === Themes.dark ? '#2eea68' : '#25e061', theme === Themes.dark ? 0.92 : 0.9),
  );
  body.addColorStop(
    0.74,
    applyAlpha(theme === Themes.dark ? '#2eea68' : '#25e061', theme === Themes.dark ? 0.9 : 0.88),
  );
  body.addColorStop(
    0.79,
    applyAlpha(theme === Themes.dark ? '#46ff82' : '#4dff88', theme === Themes.dark ? 0.84 : 0.8),
  );
  body.addColorStop(
    0.84,
    applyAlpha(theme === Themes.dark ? '#60ff94' : '#72ffa2', theme === Themes.dark ? 0.76 : 0.72),
  );
  body.addColorStop(
    0.9,
    applyAlpha(theme === Themes.dark ? '#c7ffd9' : '#dcffe7', theme === Themes.dark ? 0.3 : 0.24),
  );
  body.addColorStop(
    0.92,
    applyAlpha(theme === Themes.dark ? '#d9ffe7' : '#ecfff3', theme === Themes.dark ? 0.22 : 0.18),
  );
  body.addColorStop(
    0.97,
    applyAlpha(theme === Themes.dark ? '#d9ffe7' : '#ecfff3', theme === Themes.dark ? 0.12 : 0.1),
  );
  body.addColorStop(1, applyAlpha(theme === Themes.dark ? '#d9ffe7' : '#ecfff3', 0));
  return body;
};

const createProgressVolumeGradient = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  cx: number,
  cy: number,
  ringR: number,
  jellyW: number,
) => {
  const vol = ctx.createRadialGradient(
    cx,
    cy,
    Math.max(1, ringR - jellyW * 0.65),
    cx,
    cy,
    ringR + jellyW * 0.66,
  );
  vol.addColorStop(0, applyAlpha('#0e7f33', 0));
  vol.addColorStop(0.12, applyAlpha('#0e7f33', theme === Themes.dark ? 0.62 : 0.58));
  vol.addColorStop(0.16, applyAlpha('#0e7f33', theme === Themes.dark ? 0.72 : 0.68));
  vol.addColorStop(0.22, applyAlpha('#0e7f33', theme === Themes.dark ? 0.8 : 0.76));
  vol.addColorStop(0.28, applyAlpha('#0e7f33', theme === Themes.dark ? 0.86 : 0.82));
  vol.addColorStop(0.34, applyAlpha('#0f8f3a', theme === Themes.dark ? 0.9 : 0.86));
  vol.addColorStop(0.4, applyAlpha('#11a343', theme === Themes.dark ? 0.95 : 0.93));
  vol.addColorStop(0.48, applyAlpha('#14b34b', theme === Themes.dark ? 0.98 : 0.96));
  vol.addColorStop(0.54, applyAlpha('#18c255', 1));
  vol.addColorStop(
    0.62,
    applyAlpha(theme === Themes.dark ? '#2eea68' : '#25e061', theme === Themes.dark ? 0.95 : 0.93),
  );
  vol.addColorStop(
    0.68,
    applyAlpha(theme === Themes.dark ? '#2eea68' : '#25e061', theme === Themes.dark ? 0.92 : 0.9),
  );
  vol.addColorStop(
    0.74,
    applyAlpha(theme === Themes.dark ? '#46ff82' : '#4dff88', theme === Themes.dark ? 0.86 : 0.82),
  );
  vol.addColorStop(
    0.8,
    applyAlpha(theme === Themes.dark ? '#60ff94' : '#72ffa2', theme === Themes.dark ? 0.74 : 0.7),
  );
  vol.addColorStop(
    0.9,
    applyAlpha(theme === Themes.dark ? '#d9ffe7' : '#ecfff3', theme === Themes.dark ? 0.16 : 0.12),
  );
  vol.addColorStop(1, applyAlpha(theme === Themes.dark ? '#d9ffe7' : '#ecfff3', 0));
  return vol;
};

const strokeProgressArc = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  ringR: number,
  startA: number,
  endA: number,
) => {
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, startA, endA);
  ctx.stroke();
};

const paintProgressBody = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  cx: number,
  cy: number,
  ringR: number,
  jellyW: number,
  startA: number,
  endA: number,
) => {
  const body = createProgressBodyGradient(ctx, theme, cx, cy, ringR, jellyW);
  ctx.save();
  ctx.strokeStyle = body;
  ctx.lineWidth = jellyW * 1.06;
  ctx.lineCap = 'round';
  strokeProgressArc(ctx, cx, cy, ringR, startA, endA);
  ctx.restore();
};

const paintProgressVolume = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  cx: number,
  cy: number,
  ringR: number,
  jellyW: number,
  startA: number,
  endA: number,
) => {
  const vol = createProgressVolumeGradient(ctx, theme, cx, cy, ringR, jellyW);
  const rawSFilter = readCanvasFilter(ctx);
  if (typeof rawSFilter === 'string') {
    (ctx as unknown as { filter: string }).filter = 'blur(1.6px)';
    ctx.globalAlpha = theme === Themes.dark ? 0.42 : 0.38;
    ctx.strokeStyle = vol;
    ctx.lineWidth = jellyW * 1.08;
    ctx.lineCap = 'round';
    strokeProgressArc(ctx, cx, cy, ringR, startA, endA);
    (ctx as unknown as { filter: string }).filter = rawSFilter;
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = vol;
  ctx.lineWidth = jellyW * 0.98;
  ctx.lineCap = 'round';
  strokeProgressArc(ctx, cx, cy, ringR, startA, endA);
};

const paintProgressStrip = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  cx: number,
  cy: number,
  ringR: number,
  jellyW: number,
  startA: number,
  endA: number,
) => {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const strip = ctx.createRadialGradient(
    cx,
    cy,
    Math.max(1, ringR - jellyW * 0.38),
    cx,
    cy,
    ringR + jellyW * 0.7,
  );
  strip.addColorStop(0, applyAlpha('#ffffff', 0));
  strip.addColorStop(0.48, applyAlpha('#ffffff', theme === Themes.dark ? 0.12 : 0.18));
  strip.addColorStop(0.62, applyAlpha('#ffffff', theme === Themes.dark ? 0.18 : 0.24));
  strip.addColorStop(0.74, applyAlpha('#bfffd4', theme === Themes.dark ? 0.1 : 0.12));
  strip.addColorStop(0.88, applyAlpha('#ffffff', theme === Themes.dark ? 0.06 : 0.08));
  strip.addColorStop(1, applyAlpha('#ffffff', 0));
  ctx.strokeStyle = strip;
  ctx.lineWidth = jellyW * 0.42;
  strokeProgressArc(ctx, cx, cy, ringR + jellyW * 0.18, startA, endA);
  ctx.restore();
};

const paintProgressFineHighlight = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  cx: number,
  cy: number,
  ringR: number,
  jellyW: number,
  startA: number,
  endA: number,
) => {
  ctx.save();
  const rawSFilter = readCanvasFilter(ctx);
  if (typeof rawSFilter === 'string') {
    (ctx as unknown as { filter: string }).filter = 'blur(0.9px)';
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = theme === Themes.dark ? 0.55 : 0.48;
  ctx.strokeStyle = applyAlpha('#ffffff', 1);
  ctx.lineWidth = jellyW * 0.16;
  ctx.lineCap = 'round';
  strokeProgressArc(ctx, cx, cy, ringR + jellyW * 0.44, startA, endA);
  ctx.globalAlpha = 1;
  if (typeof rawSFilter === 'string') {
    (ctx as unknown as { filter: string }).filter = rawSFilter;
  }
  ctx.restore();
};

const paintProgressInnerShadow = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  cx: number,
  cy: number,
  ringR: number,
  jellyW: number,
  startA: number,
  endA: number,
) => {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = theme === Themes.dark ? 0.16 : 0.12;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = jellyW * 0.32;
  ctx.lineCap = 'round';
  strokeProgressArc(ctx, cx, cy, ringR - jellyW * 0.22, startA, endA);
  ctx.globalAlpha = 1;
  ctx.restore();
};

const cutProgressFeatherEnds = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  ringR: number,
  feather: number,
  tau: number,
  startA: number,
  endA: number,
) => {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const featherOne = (a: number) => {
    const x = cx + Math.cos(a) * ringR;
    const y = cy + Math.sin(a) * ringR;
    const g = ctx.createRadialGradient(x, y, 0, x, y, feather);
    g.addColorStop(0, applyAlpha('#000000', 0.78));
    g.addColorStop(0.55, applyAlpha('#000000', 0.28));
    g.addColorStop(1, applyAlpha('#000000', 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, feather, 0, tau);
    ctx.fill();
  };
  featherOne(startA);
  featherOne(endA);
  ctx.restore();
};

/**
 * @description 在 scratch 上绘制进度环主体
 * - 先裁剪到环形区域，避免越界污染
 * - 再绘制主体渐变、体积感与风格纹理
 * @param sctx scratch 画布上下文
 * @param theme 主题
 * @param cx 圆心 x
 * @param cy 圆心 y
 * @param ringR 环半径
 * @param innerR 内半径（裁剪用）
 * @param outerR 外半径（裁剪用）
 * @param jellyW 体积宽度因子
 * @param feather 端点羽化半径
 * @param tau 2π 常量
 * @param startA 起始角
 * @param endA 结束角
 * @param width scratch 宽度
 * @param height scratch 高度
 */
export const paintProgressOnScratch = (
  sctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  cx: number,
  cy: number,
  ringR: number,
  innerR: number,
  outerR: number,
  jellyW: number,
  feather: number,
  tau: number,
  startA: number,
  endA: number,
  width: number,
  height: number,
) => {
  sctx.save();
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, width, height);
  clipAnnulus(sctx, cx, cy, innerR, outerR, tau);
  paintProgressBody(sctx, theme, cx, cy, ringR, jellyW, startA, endA);
  paintProgressVolume(sctx, theme, cx, cy, ringR, jellyW, startA, endA);
  paintProgressStrip(sctx, theme, cx, cy, ringR, jellyW, startA, endA);
  paintProgressFineHighlight(sctx, theme, cx, cy, ringR, jellyW, startA, endA);
  paintProgressInnerShadow(sctx, theme, cx, cy, ringR, jellyW, startA, endA);
  cutProgressFeatherEnds(sctx, cx, cy, ringR, feather, tau, startA, endA);

  sctx.restore();
};

/**
 * 主画布直接绘制兜底（不使用 scratch）。
 */
export const paintProgressFallback = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  cx: number,
  cy: number,
  ringR: number,
  jellyW: number,
  startA: number,
  endA: number,
) => {
  const progGrad = createProgressBodyGradient(ctx, theme, cx, cy, ringR, jellyW * 0.82);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = progGrad;
  ctx.lineWidth = jellyW;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, startA, endA);
  ctx.stroke();
  ctx.restore();
};
