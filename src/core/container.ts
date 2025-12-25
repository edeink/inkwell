import { Widget } from './base';
import { resolveEdgeInsets } from './padding';

import type { BoxConstraints, BuildContext, Offset, Size, WidgetProps } from './base';
import type { Border, BorderRadius, EdgeInsets, PaddingValue } from './type';

export interface ContainerProps extends WidgetProps {
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  padding?: PaddingValue;
  margin?: PaddingValue;
  color?: string;
  border?: Border;
  borderRadius?: BorderRadius | number;
  alignment?: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}

/**
 * Container 组件 - 最常用的容器组件
 * 支持设置尺寸、内边距、外边距、背景色、边框等
 */
export class Container extends Widget<ContainerProps> {
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  padding?: EdgeInsets;
  margin?: EdgeInsets;
  color?: string;
  border?: Border;
  borderRadius?: BorderRadius;
  alignment?: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

  constructor(data: ContainerProps) {
    super(data);
    this.initContainerProperties(data);
  }

  private initContainerProperties(data: ContainerProps): void {
    this.width = data.width;
    this.height = data.height;
    this.minWidth = data.minWidth;
    this.maxWidth = data.maxWidth;
    this.minHeight = data.minHeight;
    this.maxHeight = data.maxHeight;
    this.padding = resolveEdgeInsets(data.padding);
    this.margin = resolveEdgeInsets(data.margin);
    this.color = data.color;
    this.border = data.border;
    this.borderRadius = this.normalizeBorderRadius(data.borderRadius);
    this.alignment = data.alignment;
    // 更新光标配置
    if (data.cursor !== undefined) {
      this.cursor = data.cursor;
    }
  }

  private normalizeBorderRadius(value?: BorderRadius | number): BorderRadius | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value === 'number') {
      return {
        topLeft: value,
        topRight: value,
        bottomLeft: value,
        bottomRight: value,
      };
    }
    return value;
  }

  createElement(data: ContainerProps): Widget {
    super.createElement(data);
    this.initContainerProperties(data);
    return this;
  }

  /**
   * Container 不需要绘制自己，只需要绘制背景和边框
   */
  protected paintSelf(context: BuildContext): void {
    const { renderer } = context;
    const { size } = this.renderObject;

    // 计算实际绘制区域（考虑外边距）
    // 注意：这里使用相对坐标，因为base.ts的paint方法已经处理了translate
    const marginLeft = this.margin?.left ?? 0;
    const marginTop = this.margin?.top ?? 0;

    const marginSize = this.margin
      ? {
          width: size.width - (this.margin.left ?? 0) - (this.margin.right ?? 0),
          height: size.height - (this.margin.top ?? 0) - (this.margin.bottom ?? 0),
        }
      : size;

    const borderRadius = this.borderRadius
      ? {
          topLeft: this.borderRadius.topLeft,
          topRight: this.borderRadius.topRight,
          bottomLeft: this.borderRadius.bottomLeft,
          bottomRight: this.borderRadius.bottomRight,
        }
      : undefined;

    // 绘制背景色（使用相对坐标）
    if (this.color) {
      renderer.drawRect({
        x: marginLeft,
        y: marginTop,
        width: marginSize.width,
        height: marginSize.height,
        fill: this.color,
        borderRadius,
      });
    }

    // 绘制边框（使用相对坐标）
    if (this.border) {
      renderer.drawRect({
        x: marginLeft,
        y: marginTop,
        width: marginSize.width,
        height: marginSize.height,
        stroke: this.border.color,
        strokeWidth: this.border.width,
        borderRadius,
      });
    }
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    // 计算外边距占用的空间
    const marginHorizontal = this.margin ? (this.margin.left ?? 0) + (this.margin.right ?? 0) : 0;
    const marginVertical = this.margin ? (this.margin.top ?? 0) + (this.margin.bottom ?? 0) : 0;

    // 计算内边距占用的空间
    const paddingHorizontal = this.padding
      ? (this.padding.left ?? 0) + (this.padding.right ?? 0)
      : 0;
    const paddingVertical = this.padding ? (this.padding.top ?? 0) + (this.padding.bottom ?? 0) : 0;

    // 如果指定了固定尺寸，使用固定尺寸
    let width = this.width;
    let height = this.height;

    // 如果没有指定尺寸，根据子组件和约束来确定
    if (width === undefined || height === undefined) {
      const childSize = childrenSizes[0] || { width: 0, height: 0 };

      if (width === undefined) {
        // 如果有 alignment，则尽可能撑大
        if (this.alignment && constraints.maxWidth !== Infinity) {
          width = constraints.maxWidth;
        } else {
          width = childSize.width + paddingHorizontal + marginHorizontal;
        }
      }
      if (height === undefined) {
        // 如果有 alignment，则尽可能撑大
        if (this.alignment && constraints.maxHeight !== Infinity) {
          height = constraints.maxHeight;
        } else {
          height = childSize.height + paddingVertical + marginVertical;
        }
      }
    }

    // 确保满足约束条件
    // 结合组件自身的 min/max 约束与父级传递的 constraints
    const minWidth = Math.max(constraints.minWidth, this.minWidth ?? 0);
    const maxWidth = Math.min(constraints.maxWidth, this.maxWidth ?? Infinity);
    const minHeight = Math.max(constraints.minHeight, this.minHeight ?? 0);
    const maxHeight = Math.min(constraints.maxHeight, this.maxHeight ?? Infinity);

    width = Math.max(minWidth, Math.min(width!, maxWidth));
    height = Math.max(minHeight, Math.min(height!, maxHeight));

    return { width, height };
  }

  protected getConstraintsForChild(constraints: BoxConstraints): BoxConstraints {
    // 计算可用于子组件的空间
    const marginHorizontal = this.margin ? (this.margin.left ?? 0) + (this.margin.right ?? 0) : 0;
    const marginVertical = this.margin ? (this.margin.top ?? 0) + (this.margin.bottom ?? 0) : 0;
    const paddingHorizontal = this.padding
      ? (this.padding.left ?? 0) + (this.padding.right ?? 0)
      : 0;
    const paddingVertical = this.padding ? (this.padding.top ?? 0) + (this.padding.bottom ?? 0) : 0;

    const totalHorizontal = marginHorizontal + paddingHorizontal;
    const totalVertical = marginVertical + paddingVertical;

    // 计算有效的自身约束
    const selfMinWidth = Math.max(0, (this.minWidth ?? 0) - totalHorizontal);
    const selfMaxWidth = Math.max(0, (this.maxWidth ?? Infinity) - totalHorizontal);
    const selfMinHeight = Math.max(0, (this.minHeight ?? 0) - totalVertical);
    const selfMaxHeight = Math.max(0, (this.maxHeight ?? Infinity) - totalVertical);

    // 父级约束减去内边距/外边距
    const parentMinWidth = Math.max(0, constraints.minWidth - totalHorizontal);
    const parentMaxWidth = Math.max(0, constraints.maxWidth - totalHorizontal);
    const parentMinHeight = Math.max(0, constraints.minHeight - totalVertical);
    const parentMaxHeight = Math.max(0, constraints.maxHeight - totalVertical);

    // 如果指定了固定尺寸，子组件的约束基于固定尺寸
    if (this.width !== undefined && this.height !== undefined) {
      const childWidth = Math.max(0, this.width - totalHorizontal);
      const childHeight = Math.max(0, this.height - totalVertical);

      // 如果有 alignment，则子组件约束为松散的（0~max）
      if (this.alignment) {
        return {
          minWidth: 0,
          maxWidth: childWidth,
          minHeight: 0,
          maxHeight: childHeight,
        };
      }

      return {
        minWidth: childWidth,
        maxWidth: childWidth,
        minHeight: childHeight,
        maxHeight: childHeight,
      };
    }

    // 如果有 alignment，也返回松散约束
    if (this.alignment) {
      return {
        minWidth: 0,
        maxWidth: parentMaxWidth,
        minHeight: 0,
        maxHeight: parentMaxHeight,
      };
    }

    // 否则，传递调整后的约束（交集）
    return {
      minWidth: Math.max(parentMinWidth, selfMinWidth),
      maxWidth: Math.min(parentMaxWidth, selfMaxWidth),
      minHeight: Math.max(parentMinHeight, selfMinHeight),
      maxHeight: Math.min(parentMaxHeight, selfMaxHeight),
    };
  }

  protected positionChild(): Offset {
    // 计算子组件的位置（考虑外边距和内边距）
    const marginLeft = this.margin?.left || 0;
    const marginTop = this.margin?.top || 0;
    const paddingLeft = this.padding?.left || 0;
    const paddingTop = this.padding?.top || 0;

    let x = marginLeft + paddingLeft;
    let y = marginTop + paddingTop;

    if (this.alignment && this.children.length > 0) {
      const childSize = this.children[0].renderObject.size;
      const margin = this.margin;
      const padding = this.padding;
      const marginHorizontal = margin ? (margin.left || 0) + (margin.right || 0) : 0;
      const marginVertical = margin ? (margin.top || 0) + (margin.bottom || 0) : 0;
      const paddingHorizontal = padding ? (padding.left || 0) + (padding.right || 0) : 0;
      const paddingVertical = padding ? (padding.top || 0) + (padding.bottom || 0) : 0;

      const contentWidth =
        (this.renderObject.size.width || 0) - marginHorizontal - paddingHorizontal;
      const contentHeight = (this.renderObject.size.height || 0) - marginVertical - paddingVertical;

      if (this.alignment === 'center') {
        x += Math.max(0, (contentWidth - childSize.width) / 2);
        y += Math.max(0, (contentHeight - childSize.height) / 2);
      } else if (this.alignment === 'topRight') {
        x += Math.max(0, contentWidth - childSize.width);
      } else if (this.alignment === 'bottomLeft') {
        y += Math.max(0, contentHeight - childSize.height);
      } else if (this.alignment === 'bottomRight') {
        x += Math.max(0, contentWidth - childSize.width);
        y += Math.max(0, contentHeight - childSize.height);
      }
    }

    return {
      dx: x,
      dy: y,
    };
  }
}
