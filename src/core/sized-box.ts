import { Widget } from './base';

import type { BoxConstraints, Offset, Size, WidgetProps } from './base';

/**
 * SizedBox组件的数据接口
 */
export interface SizedBoxProps extends WidgetProps {
  width?: number; // 固定宽度
  height?: number; // 固定高度
}

/**
 * SizedBox布局组件，为子组件提供固定尺寸
 * 类似于Flutter的SizedBox widget
 */
export class SizedBox extends Widget<SizedBoxProps> {
  // 固定尺寸
  fixedWidth?: number;
  fixedHeight?: number;

  constructor(data: SizedBoxProps) {
    super(data);
    this.initSizedBoxProperties(data);
  }

  /**
   * 初始化SizedBox特有属性
   */
  private initSizedBoxProperties(data: SizedBoxProps): void {
    this.fixedWidth = typeof data.width === 'number' ? Math.max(0, data.width) : data.width;
    this.fixedHeight = typeof data.height === 'number' ? Math.max(0, data.height) : data.height;
  }

  /**
   * 执行布局计算
   */
  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    // 计算SizedBox的尺寸
    let width = this.fixedWidth;
    let height = this.fixedHeight;

    // 如果没有指定固定宽度，使用约束的最小宽度或子组件的宽度
    if (width === undefined) {
      if (childrenSizes.length > 0) {
        width = childrenSizes[0].width;
      } else {
        width = constraints.minWidth;
      }
    }

    // 如果没有指定固定高度，使用约束的最小高度或子组件的高度
    if (height === undefined) {
      if (childrenSizes.length > 0) {
        height = childrenSizes[0].height;
      } else {
        height = constraints.minHeight;
      }
    }

    // 确保满足约束条件
    width = Math.max(constraints.minWidth, Math.min(width, constraints.maxWidth));
    height = Math.max(constraints.minHeight, Math.min(height, constraints.maxHeight));

    return { width, height };
  }

  /**
   * 获取子组件的约束
   */
  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    // SizedBox只支持一个子组件
    if (childIndex > 0) {
      return {
        minWidth: 0,
        maxWidth: 0,
        minHeight: 0,
        maxHeight: 0,
      };
    }

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

    const hasWidth = typeof this.fixedWidth === 'number';
    const hasHeight = typeof this.fixedHeight === 'number';

    const width = hasWidth
      ? clamp(this.fixedWidth!, constraints.minWidth, constraints.maxWidth)
      : 0;
    const height = hasHeight
      ? clamp(this.fixedHeight!, constraints.minHeight, constraints.maxHeight)
      : 0;

    return {
      minWidth: hasWidth ? width : 0,
      maxWidth: hasWidth ? width : constraints.maxWidth,
      minHeight: hasHeight ? height : 0,
      maxHeight: hasHeight ? height : constraints.maxHeight,
    };
  }

  /**
   * 定位子组件
   */
  protected positionChild(childIndex: number, childSize: Size): Offset {
    // SizedBox只支持一个子组件，将其居中放置
    if (childIndex > 0) {
      return { dx: 0, dy: 0 };
    }

    const { size } = this.renderObject;

    // 将子组件居中放置
    const x = (size.width - childSize.width) / 2;
    const y = (size.height - childSize.height) / 2;

    return { dx: Math.max(0, x), dy: Math.max(0, y) };
  }
}
