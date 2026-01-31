import { applyAlpha } from './apply-alpha';
import { setCanvasFilter } from './canvas-filter';

import type { ThemePalette } from '@/styles/theme';

import { Themes } from '@/styles/theme';

/**
 * 进度槽（环形凹槽）绘制：包含裁剪、底色、景深、AO 与结构线。
 */
export const clipAnnulus = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  tau: number,
) => {
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, tau);
  ctx.arc(cx, cy, innerR, 0, tau, true);
  try {
    ctx.clip('evenodd');
  } catch {
    ctx.clip();
  }
};

export const paintGrooveBase = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  width: number,
  height: number,
) => {
  const grooveGrad = ctx.createRadialGradient(cx, cy, innerR * 0.78, cx, cy, outerR * 1.02);
  if (theme === Themes.dark) {
    grooveGrad.addColorStop(0, applyAlpha('#1a1e28', 0.85));
    grooveGrad.addColorStop(0.52, applyAlpha('#121521', 0.9));
    grooveGrad.addColorStop(1, applyAlpha('#070912', 0.92));
  } else {
    grooveGrad.addColorStop(0, applyAlpha('#fdfefe', 1));
    grooveGrad.addColorStop(0.55, applyAlpha('#e8eef6', 1));
    grooveGrad.addColorStop(1, applyAlpha('#b6c1cc', 0.95));
  }
  ctx.fillStyle = grooveGrad;
  ctx.fillRect(cx - outerR * 1.1, cy - outerR * 1.1, outerR * 2.2, outerR * 2.2);
};

export const paintGrooveDepth = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  rawFilter: unknown,
  cx: number,
  cy: number,
  outerR: number,
  width: number,
  height: number,
) => {
  const depth = ctx.createRadialGradient(
    cx + outerR * 0.3,
    cy - outerR * 0.34,
    outerR * 0.2,
    cx,
    cy,
    outerR * 1.2,
  );
  depth.addColorStop(0, applyAlpha('#ffffff', theme === Themes.dark ? 0.12 : 0.42));
  depth.addColorStop(0.55, applyAlpha('#ffffff', 0));
  depth.addColorStop(1, applyAlpha('#000000', theme === Themes.dark ? 0.24 : 0.16));
  ctx.globalAlpha = theme === Themes.dark ? 0.78 : 0.72;
  const depthHadFilter = setCanvasFilter(
    ctx,
    rawFilter,
    `blur(${theme === Themes.dark ? 12 : 14}px)`,
  );
  ctx.fillStyle = depth;
  ctx.fillRect(cx - outerR * 1.1, cy - outerR * 1.1, outerR * 2.2, outerR * 2.2);
  if (depthHadFilter) {
    setCanvasFilter(ctx, rawFilter, null);
  }
  ctx.globalAlpha = 1;
};

export const paintGrooveAO = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  rawFilter: unknown,
  cx: number,
  cy: number,
  innerR: number,
  ringW: number,
  tau: number,
) => {
  ctx.save();
  const aoHadFilter = setCanvasFilter(ctx, rawFilter, `blur(${theme === Themes.dark ? 22 : 20}px)`);
  ctx.lineCap = 'round';
  ctx.globalAlpha = theme === Themes.dark ? 0.2 : 0.12;
  ctx.strokeStyle = applyAlpha('#000000', 1);
  ctx.lineWidth = ringW * 0.34;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR + ringW * 0.14, 0, tau);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (aoHadFilter) {
    setCanvasFilter(ctx, rawFilter, null);
  }
  ctx.restore();
};

export const paintGrooveStructureLines = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  tau: number,
) => {
  ctx.strokeStyle =
    theme === Themes.dark ? applyAlpha('#ffffff', 0.08) : applyAlpha('#ffffff', 0.22);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR + 0.5, 0, tau);
  ctx.stroke();

  ctx.strokeStyle =
    theme === Themes.dark ? applyAlpha('#000000', 0.42) : applyAlpha('#000000', 0.12);
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 0.5, 0, tau);
  ctx.stroke();
};
