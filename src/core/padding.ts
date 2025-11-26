import React from 'react';

import { Widget } from './base';

import type {
  BoxConstraints,
  BuildContext,
  EdgeInsets,
  JSXComponentProps,
  Offset,
  Size,
  WidgetData,
} from './base';

export interface PaddingData extends WidgetData {
  padding: EdgeInsets | number;
  child?: WidgetData;
}

/**
 * Padding 组件 - 为子组件添加内边距
 */
export class Padding extends Widget<PaddingData> {
  padding: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

  // 注册 Padding 组件类型
  static {
    Widget.registerType('Padding', Padding);
  }

  constructor(data: PaddingData) {
    super(data);
    this.initPaddingProperties(data);
  }

  private initPaddingProperties(data: PaddingData): void {
    this.padding = this.normalizeEdgeInsets(data.padding);
  }

  private normalizeEdgeInsets(value: EdgeInsets | number): EdgeInsets {
    if (typeof value === 'number') {
      return { top: value, right: value, bottom: value, left: value };
    }
    return value;
  }

  createElement(data: PaddingData): Widget<PaddingData> {
    super.createElement(data);
    this.initPaddingProperties(data);
    return this;
  }

  protected createChildWidget(childData: WidgetData): Widget | null {
    // Padding 只能有一个子组件
    return Widget.createWidget(childData);
  }

  /**
   * Padding 不需要绘制自己
   */
  protected paintSelf(context: BuildContext): void {
    // Padding 组件不绘制任何内容
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const childSize = childrenSizes[0] || { width: 0, height: 0 };

    // 计算总尺寸（子组件尺寸 + 内边距）
    const width = childSize.width + this.padding.left + this.padding.right;
    const height = childSize.height + this.padding.top + this.padding.bottom;

    // 确保满足约束条件
    return {
      width: Math.max(constraints.minWidth, Math.min(width, constraints.maxWidth)),
      height: Math.max(constraints.minHeight, Math.min(height, constraints.maxHeight)),
    };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    // 计算可用于子组件的空间
    const paddingHorizontal = this.padding.left + this.padding.right;
    const paddingVertical = this.padding.top + this.padding.bottom;

    return {
      minWidth: Math.max(0, constraints.minWidth - paddingHorizontal),
      maxWidth: Math.max(0, constraints.maxWidth - paddingHorizontal),
      minHeight: Math.max(0, constraints.minHeight - paddingVertical),
      maxHeight: Math.max(0, constraints.maxHeight - paddingVertical),
    };
  }

  protected positionChild(childIndex: number, childSize: Size): Offset {
    // 子组件的位置偏移内边距
    return {
      dx: this.padding.left,
      dy: this.padding.top,
    };
  }
}

// 便捷函数：创建对称内边距
export function symmetric(vertical: number = 0, horizontal: number = 0): EdgeInsets {
  return {
    top: vertical,
    bottom: vertical,
    left: horizontal,
    right: horizontal,
  };
}

// 便捷函数：创建只有某一边的内边距
export function only(options: {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}): EdgeInsets {
  return {
    top: options.top || 0,
    right: options.right || 0,
    bottom: options.bottom || 0,
    left: options.left || 0,
  };
}

// 便捷函数：创建所有边相同的内边距
export function all(value: number): EdgeInsets {
  return {
    top: value,
    right: value,
    bottom: value,
    left: value,
  };
}

export type PaddingProps = Omit<PaddingData, 'type' | 'child' | 'children'> & JSXComponentProps;
export const PaddingElement: React.FC<PaddingProps> = () => null;
