import { Widget } from './base';

import type { BoxConstraints, Offset, Size, WidgetProps } from './base';

export interface PositionedProps extends WidgetProps {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  child?: WidgetProps;
}

/**
 * Positioned 组件 - 在 Stack 中定位子组件
 */
export class Positioned extends Widget<PositionedProps> {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;

  constructor(data: PositionedProps) {
    super(data);
    this.initPositionedProperties(data);
  }

  private initPositionedProperties(data: PositionedProps): void {
    this.left = data.left;
    this.top = data.top;
    this.right = data.right;
    this.bottom = data.bottom;
    this.width = data.width;
    this.height = data.height;
  }

  createElement(data: PositionedProps): Widget {
    super.createElement(data);
    this.initPositionedProperties(data);
    return this;
  }

  /**
   * 处理组件属性更新
   *
   * @description
   * 检查属性变更是否影响布局或绘制。
   * - 尺寸相关属性变更 (width, height, left+right, top+bottom)：标记自身需要重新布局 (`markNeedsLayout`)。
   * - 仅位置相关属性变更 (left, top)：优化处理，仅通知父级需要重新布局 (`markParentNeedsLayout`)，
   *   但标记自身为 Paint Dirty (`markNeedsPaint`)。这样可以避免 Positioned 组件自身的 `performLayout`
   *   和子组件的 `layout` 重复执行，因为位置变化不改变自身尺寸。
   *
   * @param oldProps 旧的属性
   */
  protected didUpdateWidget(oldProps: PositionedProps): void {
    // 检查布局是否受到影响
    // 注意：Positioned 的 left/top 变化通常只影响位置，不影响自身尺寸（除非同时指定了 right/bottom）
    // 如果只影响位置，我们只需要通知父级 (Stack) 重新布局，而不需要标记自身需要 Layout

    const newProps = this.data;
    let sizeChanged = false;
    let posChanged = false;

    // 检查宽度相关
    if (newProps.width !== oldProps.width) {
      sizeChanged = true;
    } else if (newProps.left !== undefined && newProps.right !== undefined) {
      if (newProps.left !== oldProps.left || newProps.right !== oldProps.right) {
        sizeChanged = true;
      }
    } else {
      // 只有 left 或 只有 right 或 都无
      if (newProps.left !== oldProps.left) {
        posChanged = true;
      }
      if (newProps.right !== oldProps.right) {
        posChanged = true;
      }
    }

    // 检查高度相关
    if (newProps.height !== oldProps.height) {
      sizeChanged = true;
    } else if (newProps.top !== undefined && newProps.bottom !== undefined) {
      if (newProps.top !== oldProps.top || newProps.bottom !== oldProps.bottom) {
        sizeChanged = true;
      }
    } else {
      if (newProps.top !== oldProps.top) {
        posChanged = true;
      }
      if (newProps.bottom !== oldProps.bottom) {
        posChanged = true;
      }
    }

    if (sizeChanged) {
      this.markNeedsLayout();
    } else if (posChanged) {
      // 仅位置改变，标记父级需要布局，但自身不需要重新计算尺寸
      // 这样可以跳过 performLayout 和子组件 layout
      this.markParentNeedsLayout();
      // 仍然标记 paint dirty，因为位置变了，可能需要重绘
      this.markNeedsPaint();
    }
    // else: nothing changed
  }

  /**
   * 执行 Positioned 的布局逻辑
   *
   * @description
   * 计算 Positioned 组件的尺寸。
   * 尺寸计算优先级：
   * 1. 显式指定的 `width` / `height`。
   * 2. 同时指定 `left` + `right` / `top` + `bottom` 计算出的剩余空间。
   * 3. 子组件的尺寸 (shrink wrap)。
   *
   * @param constraints 父组件传递的布局约束
   * @param childrenSizes 子组件的布局结果
   * @returns Positioned 的最终尺寸
   */
  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const childSize = childrenSizes[0] || { width: 0, height: 0 };

    // Positioned 组件的尺寸由其定位属性和子组件决定
    let width = childSize.width;
    let height = childSize.height;

    // 如果指定了 width 或 height，使用指定值
    if (this.width !== undefined) {
      width = this.width;
    }
    if (this.height !== undefined) {
      height = this.height;
    }

    // 如果同时指定了 left 和 right，宽度由它们决定
    if (this.left !== undefined && this.right !== undefined) {
      width = constraints.maxWidth - this.left - this.right;
    }

    // 如果同时指定了 top 和 bottom，高度由它们决定
    if (this.top !== undefined && this.bottom !== undefined) {
      height = constraints.maxHeight - this.top - this.bottom;
    }

    if (
      this.renderObject.size &&
      this.renderObject.size.width === width &&
      this.renderObject.size.height === height
    ) {
      return this.renderObject.size;
    }

    return { width, height };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    _childIndex: number,
  ): BoxConstraints {
    let minWidth = 0;
    let maxWidth = constraints.maxWidth;
    let minHeight = 0;
    let maxHeight = constraints.maxHeight;

    // 如果指定了 width，子组件的宽度约束为固定值
    if (this.width !== undefined) {
      minWidth = maxWidth = this.width;
    } else if (this.left !== undefined && this.right !== undefined) {
      // 如果同时指定了 left 和 right，计算可用宽度
      const availableWidth = constraints.maxWidth - this.left - this.right;
      minWidth = maxWidth = Math.max(0, availableWidth);
    }

    // 如果指定了 height，子组件的高度约束为固定值
    if (this.height !== undefined) {
      minHeight = maxHeight = this.height;
    } else if (this.top !== undefined && this.bottom !== undefined) {
      // 如果同时指定了 top 和 bottom，计算可用高度
      const availableHeight = constraints.maxHeight - this.top - this.bottom;
      minHeight = maxHeight = Math.max(0, availableHeight);
    }

    return {
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
    };
  }

  /**
   * 获取在 Stack 中的实际位置
   * 这个方法会被 Stack 组件调用
   */
  public getStackPosition(stackSize: Size): Offset {
    let dx = 0;
    let dy = 0;

    const { size } = this.renderObject;

    // 计算 x 位置
    if (this.left !== undefined) {
      dx = this.left;
    } else if (this.right !== undefined) {
      dx = stackSize.width - this.right - (size.width || 0);
    }

    // 计算 y 位置
    if (this.top !== undefined) {
      dy = this.top;
    } else if (this.bottom !== undefined) {
      dy = stackSize.height - this.bottom - (size.height || 0);
    }

    return { dx, dy };
  }

  /**
   * 检查是否是 Positioned 组件
   */
  public get isPositioned(): boolean {
    return true;
  }
}

// 便捷函数：创建填充整个 Stack 的 Positioned
export function fill(child: WidgetProps): PositionedProps {
  return {
    __inkwellType: 'Positioned',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    child,
  };
}

// 便捷函数：从左上角定位
export function fromLTWH(
  left: number,
  top: number,
  width: number,
  height: number,
  child: WidgetProps,
): PositionedProps {
  return {
    __inkwellType: 'Positioned',
    left,
    top,
    width,
    height,
    child,
  };
}
