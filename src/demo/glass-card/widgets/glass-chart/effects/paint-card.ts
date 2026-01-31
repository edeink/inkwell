import { applyAlpha } from './apply-alpha';

import type { ThemePalette } from '@/styles/theme';

import { roundedRectPath } from '@/demo/glass-card/helpers/canvas';
import { Themes } from '@/styles/theme';

/**
 * 卡片基础绘制：底色、阴影、描边与反光裁剪辅助。
 */
export const paintCardBase = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  width: number,
  height: number,
  r: number,
  bg: string,
  border: string,
) => {
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  roundedRectPath(ctx, 0, 0, width, height, r);
  ctx.save();
  ctx.shadowColor = applyAlpha('#000000', theme === Themes.dark ? 0.6 : 0.18);
  ctx.shadowBlur = theme === Themes.dark ? 26 : 20;
  ctx.shadowOffsetY = theme === Themes.dark ? 12 : 10;
  const cardGrad = ctx.createLinearGradient(0, 0, width, height);
  if (theme === Themes.dark) {
    cardGrad.addColorStop(0, applyAlpha('#202431', 0.96));
    cardGrad.addColorStop(0.55, applyAlpha(bg, 0.92));
    cardGrad.addColorStop(1, applyAlpha('#101219', 0.96));
  } else {
    cardGrad.addColorStop(0, applyAlpha('#ffffff', 0.98));
    cardGrad.addColorStop(0.55, applyAlpha('#f7f8fb', 0.96));
    cardGrad.addColorStop(1, applyAlpha('#ffffff', 0.98));
  }
  ctx.fillStyle = cardGrad;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.stroke();
};

export const clipRoundedRect = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  r: number,
) => {
  ctx.beginPath();
  roundedRectPath(ctx, 0, 0, width, height, r);
  ctx.clip();
};

export const paintCardGlare = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  width: number,
  height: number,
) => {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const glare = ctx.createLinearGradient(0, 0, width, height);
  glare.addColorStop(0, applyAlpha('#ffffff', theme === Themes.dark ? 0.06 : 0.12));
  glare.addColorStop(0.35, applyAlpha('#ffffff', 0));
  glare.addColorStop(1, applyAlpha('#ffffff', 0));
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};
