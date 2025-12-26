import { Widget } from './base';

import type { BoxConstraints, BuildContext, Offset, Size, WidgetProps } from './base';

export interface ClipRectProps extends WidgetProps {
  // No extra props needed for basic clipping
}

/**
 * 裁剪组件
 * 将子组件裁剪为矩形区域
 */
export class ClipRect extends Widget<ClipRectProps> {
  skipEvent: boolean = true;

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

    const ctx = renderer.getRawInstance() as CanvasRenderingContext2D | null;
    if (ctx) {
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.clip();
    }
  }
}
