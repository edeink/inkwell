import type { BoxConstraints, BuildContext, Size, WidgetProps } from '@/core';
import type { ThemePalette } from '@/styles/theme';

import { Widget } from '@/core';
import { applyAlpha } from '@/core/helper/color';
import { Themes } from '@/styles/theme';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * 圆形按钮的 Canvas 绘制层：
 * - 单独拆出以便复用，并避免在 React/JSX 组件里塞大量绘制细节
 * - hover/down 通过 0~1 的插值控制阴影、反光与玻璃质感
 */
export interface GlassRoundButtonCanvasProps extends WidgetProps {
  theme: ThemePalette;
  border: string;
  hoverT: number;
  downT: number;
}

export class GlassRoundButtonCanvas extends Widget<GlassRoundButtonCanvasProps> {
  protected performLayout(constraints: BoxConstraints): Size {
    const maxW = Number.isFinite(constraints.maxWidth) ? constraints.maxWidth : 64;
    const maxH = Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : 64;
    const minW = Number.isFinite(constraints.minWidth) ? constraints.minWidth : 0;
    const minH = Number.isFinite(constraints.minHeight) ? constraints.minHeight : 0;
    const width = Math.max(minW, Math.min(maxW, constraints.maxWidth));
    const height = Math.max(minH, Math.min(maxH, constraints.maxHeight));
    return { width, height };
  }

  protected didUpdateWidget(): void {
    this.markNeedsPaint();
  }

  protected paintSelf(context: BuildContext): void {
    const renderer = context.renderer;
    const ctx = renderer.getRawInstance?.() as CanvasRenderingContext2D | null;
    const theme = this.data.theme ?? Themes.light;
    const { width, height } = this.renderObject.size;
    if (!ctx || width <= 0 || height <= 0) {
      return;
    }

    const d = Math.min(width, height);
    const r = d / 2;
    const cx = width / 2;
    const cy = height / 2;

    const hoverT = clamp01(this.data.hoverT);
    const downT = clamp01(this.data.downT);
    const pressShift = downT * 1.2;

    const rawFilter = (ctx as unknown as { filter?: unknown }).filter;
    const setFilter = (value: string | null) => {
      if (typeof rawFilter === 'string') {
        if (value === null) {
          (ctx as unknown as { filter: string }).filter = rawFilter;
        } else {
          (ctx as unknown as { filter: string }).filter = value;
        }
        return true;
      }
      return false;
    };

    ctx.save();
    ctx.translate(0, pressShift);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();

    ctx.save();
    ctx.shadowColor = applyAlpha('#000000', theme === Themes.dark ? 0.44 : 0.16);
    ctx.shadowBlur = theme === Themes.dark ? 26 + hoverT * 6 : 22 + hoverT * 6;
    ctx.shadowOffsetY = theme === Themes.dark ? 14 + hoverT * 1.5 : 12 + hoverT * 1.5;
    const base = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    const lightA0 = theme === Themes.dark ? 0.14 : 0.62;
    const lightA1 = theme === Themes.dark ? 0.06 : 0.32;
    const lightA2 = theme === Themes.dark ? 0.1 : 0.46;
    base.addColorStop(0, applyAlpha('#ffffff', lightA0 + hoverT * 0.06));
    base.addColorStop(0.52, applyAlpha('#ffffff', lightA1 + hoverT * 0.06));
    base.addColorStop(1, applyAlpha('#ffffff', lightA2 + hoverT * 0.05));
    ctx.fillStyle = base;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const blurHad = setFilter(`blur(${theme === Themes.dark ? 14 : 16}px)`);
    const frosted = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    frosted.addColorStop(0, applyAlpha('#ffffff', theme === Themes.dark ? 0.06 : 0.18));
    frosted.addColorStop(0.55, applyAlpha('#ffffff', 0));
    frosted.addColorStop(1, applyAlpha('#000000', theme === Themes.dark ? 0.24 : 0.12));
    ctx.globalAlpha = (theme === Themes.dark ? 0.55 : 0.42) + hoverT * 0.1 - downT * 0.06;
    ctx.fillStyle = frosted;
    ctx.fillRect(cx - r - 14, cy - r - 14, d + 28, d + 28);
    ctx.globalAlpha = 1;
    if (blurHad) {
      setFilter(null);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const hi = ctx.createRadialGradient(
      cx - r * 0.35,
      cy - r * 0.4,
      0,
      cx - r * 0.35,
      cy - r * 0.4,
      r * 1.55,
    );
    hi.addColorStop(
      0,
      applyAlpha('#ffffff', (theme === Themes.dark ? 0.24 : 0.38) + hoverT * 0.12),
    );
    hi.addColorStop(0.52, applyAlpha('#ffffff', 0.08 + hoverT * 0.08));
    hi.addColorStop(1, applyAlpha('#ffffff', 0));
    ctx.fillStyle = hi;
    ctx.fillRect(cx - r - 10, cy - r - 10, d + 20, d + 20);
    ctx.restore();

    ctx.restore();

    ctx.strokeStyle = applyAlpha('#ffffff', (theme === Themes.dark ? 0.18 : 0.4) + hoverT * 0.08);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = applyAlpha('#000000', theme === Themes.dark ? 0.42 : 0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
