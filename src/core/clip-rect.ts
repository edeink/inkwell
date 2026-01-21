import { Widget } from './base';

import type {
  BoxConstraints,
  BuildContext,
  Offset,
  PointerEvents,
  Size,
  WidgetProps,
} from './base';

export interface ClipRectProps extends WidgetProps {
  borderRadius?: number;
}

/**
 * 裁剪组件
 * 将子组件裁剪为矩形区域
 */
export class ClipRect extends Widget<ClipRectProps> {
  pointerEvent: PointerEvents = 'none';

  constructor(data: ClipRectProps) {
    super(data);
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    // 尽可能小，适应子组件大小
    // 或者尽可能大，适应父组件约束
    // 通常 ClipRect 应该跟随子组件大小，或者填充父组件
    // 这里采取类似于 Container 的逻辑：如果子组件存在，跟随子组件；否则跟随约束

    if (childrenSizes.length > 0) {
      return childrenSizes[0];
    }

    // 如果没有子组件，尝试填充
    return {
      width: constraints.minWidth,
      height: constraints.minHeight,
    };
  }

  protected positionChild(childIndex: number, childSize: Size): Offset {
    void childIndex;
    void childSize;
    return { dx: 0, dy: 0 };
  }

  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const { width, height } = this.renderObject.size;

    const radius = typeof this.props.borderRadius === 'number' ? this.props.borderRadius : 0;
    if (radius > 0 && renderer.getRawInstance) {
      const ctx = renderer.getRawInstance() as CanvasRenderingContext2D | null;
      if (ctx) {
        const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
        ctx.beginPath();
        const hasRoundRect = 'roundRect' in ctx && typeof ctx.roundRect === 'function';
        if (hasRoundRect) {
          ctx.roundRect(0, 0, width, height, r);
        } else {
          const x = 0;
          const y = 0;
          const w = width;
          const h = height;
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.arcTo(x + w, y, x + w, y + r, r);
          ctx.lineTo(x + w, y + h - r);
          ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
          ctx.lineTo(x + r, y + h);
          ctx.arcTo(x, y + h, x, y + h - r, r);
          ctx.lineTo(x, y + r);
          ctx.arcTo(x, y, x + r, y, r);
          ctx.closePath();
        }
        ctx.clip();
        return;
      }
    }

    renderer.clipRect(0, 0, width, height);
  }
}
