import React from 'react';

import { Widget } from './base';

import type {
  BoxConstraints,
  BuildContext,
  JSXComponentProps,
  Offset,
  Size,
  WidgetData,
} from './base';

export interface PositionedData extends WidgetData {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  child?: WidgetData;
}

/**
 * Positioned 组件 - 在 Stack 中定位子组件
 */
export class Positioned extends Widget<PositionedData> {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;

  // 注册 Positioned 组件类型
  static {
    Widget.registerType('Positioned', Positioned);
  }

  constructor(data: PositionedData) {
    super(data);
    this.initPositionedProperties(data);
  }

  private initPositionedProperties(data: PositionedData): void {
    this.left = data.left;
    this.top = data.top;
    this.right = data.right;
    this.bottom = data.bottom;
    this.width = data.width;
    this.height = data.height;
  }

  createElement(data: PositionedData): Widget {
    super.createElement(data);
    this.initPositionedProperties(data);
    return this;
  }

  protected createChildWidget(childData: WidgetData): Widget | null {
    // Positioned 只能有一个子组件
    return Widget.createWidget(childData);
  }

  /**
   * Positioned 不需要绘制自己
   */
  protected paintSelf(context: BuildContext): void {
    // Positioned 组件不绘制任何内容
  }

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

    return { width, height };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
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

  protected positionChild(childIndex: number, childSize: Size): Offset {
    // Positioned 组件的子组件位置始终为 (0, 0)
    // 实际的定位由父组件 Stack 处理
    return { dx: 0, dy: 0 };
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
  public isPositioned(): boolean {
    return true;
  }
}

export type PositionedProps = Omit<PositionedData, 'type' | 'child' | 'children'> &
  JSXComponentProps;
export const PositionedElement: React.FC<PositionedProps> = () => null;

// 便捷函数：创建填充整个 Stack 的 Positioned
export function fill(child: WidgetData): PositionedData {
  return {
    type: 'Positioned',
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
  child: WidgetData,
): PositionedData {
  return {
    type: 'Positioned',
    left,
    top,
    width,
    height,
    child,
  };
}
