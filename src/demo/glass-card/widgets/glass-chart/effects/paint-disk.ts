import { applyAlpha } from './apply-alpha';
import { setCanvasFilter } from './canvas-filter';

import type { ThemePalette } from '@/styles/theme';

import { Themes } from '@/styles/theme';

/**
 * 中心圆盘绘制：用于承载数字文本的“玻璃芯”区域。
 */
export const paintCenterDisk = (
  ctx: CanvasRenderingContext2D,
  theme: ThemePalette,
  rawFilter: unknown,
  cx: number,
  cy: number,
  diskR: number,
  ringW: number,
  tau: number,
) => {
  ctx.save();
  ctx.shadowColor = applyAlpha('#000000', theme === Themes.dark ? 0.22 : 0.1);
  ctx.shadowBlur = theme === Themes.dark ? 26 : 24;
  ctx.shadowOffsetY = theme === Themes.dark ? 16 : 14;
  ctx.fillStyle = theme === Themes.dark ? applyAlpha('#0f1118', 0.75) : applyAlpha('#ffffff', 0.98);
  ctx.beginPath();
  ctx.arc(cx, cy, diskR, 0, tau);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, diskR, 0, tau);
  ctx.clip();
  const diskHadFilter = setCanvasFilter(
    ctx,
    rawFilter,
    `blur(${theme === Themes.dark ? 22 : 20}px)`,
  );
  ctx.globalCompositeOperation = 'source-atop';
  const diskShadow = ctx.createRadialGradient(cx, cy, diskR * 0.55, cx, cy, diskR * 1.05);
  diskShadow.addColorStop(0, applyAlpha('#000000', 0));
  diskShadow.addColorStop(0.8, applyAlpha('#000000', theme === Themes.dark ? 0.1 : 0.06));
  diskShadow.addColorStop(1, applyAlpha('#000000', theme === Themes.dark ? 0.14 : 0.1));
  ctx.fillStyle = diskShadow;
  ctx.fillRect(cx - diskR * 1.2, cy - diskR * 1.2, diskR * 2.4, diskR * 2.4);
  if (diskHadFilter) {
    setCanvasFilter(ctx, rawFilter, null);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, diskR, 0, tau);
  ctx.clip();
  const diskHi = ctx.createRadialGradient(
    cx - diskR * 0.25,
    cy - diskR * 0.3,
    0,
    cx - diskR * 0.25,
    cy - diskR * 0.3,
    diskR * 1.2,
  );
  diskHi.addColorStop(0, applyAlpha('#ffffff', theme === Themes.dark ? 0.08 : 0.22));
  diskHi.addColorStop(0.6, applyAlpha('#ffffff', 0));
  diskHi.addColorStop(1, applyAlpha('#ffffff', 0));
  ctx.fillStyle = diskHi;
  ctx.fillRect(cx - diskR * 1.2, cy - diskR * 1.2, diskR * 2.4, diskR * 2.4);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, diskR, 0, tau);
  ctx.clip();
  const occHadFilter = setCanvasFilter(
    ctx,
    rawFilter,
    `blur(${theme === Themes.dark ? 24 : 22}px)`,
  );
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = theme === Themes.dark ? 0.16 : 0.1;
  ctx.strokeStyle = applyAlpha('#000000', 1);
  ctx.lineWidth = ringW * 0.58;
  ctx.beginPath();
  ctx.arc(cx, cy, diskR + ringW * 0.05, 0, tau);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (occHadFilter) {
    setCanvasFilter(ctx, rawFilter, null);
  }
  ctx.restore();
};
