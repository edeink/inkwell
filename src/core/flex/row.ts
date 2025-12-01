import React from 'react';

import { Widget } from '../base';
import { ComponentType } from '../type';

import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from './type';

import type {
  BoxConstraints,
  BuildContext,
  JSXComponentProps,
  Offset,
  Size,
  WidgetData,
} from '../base';

/**
 * Row布局组件的数据接口
 */
export interface RowData extends WidgetData {
  mainAxisAlignment?: MainAxisAlignment;
  crossAxisAlignment?: CrossAxisAlignment;
  mainAxisSize?: MainAxisSize;
  spacing?: number;
}

/**
 * Row布局组件，水平排列子组件
 * 类似于Flutter的Row widget
 */
export class Row extends Widget<RowData> {
  // 布局属性
  mainAxisAlignment: MainAxisAlignment = MainAxisAlignment.Start;
  crossAxisAlignment: CrossAxisAlignment = CrossAxisAlignment.Center;
  mainAxisSize: MainAxisSize = MainAxisSize.Max;
  spacing: number = 0;

  static {
    Widget.registerType(ComponentType.Row, Row);
  }

  constructor(data: RowData) {
    super(data);
    this.initRowProperties(data);
  }

  /**
   * 初始化Row特有属性
   */
  private initRowProperties(data: RowData): void {
    this.mainAxisAlignment = data.mainAxisAlignment || MainAxisAlignment.Start;
    this.crossAxisAlignment = data.crossAxisAlignment || CrossAxisAlignment.Center;
    this.mainAxisSize = data.mainAxisSize || MainAxisSize.Max;
    this.spacing = data.spacing || 0;
  }

  /**
   * 创建组件
   */
  createElement(data: RowData): Widget {
    super.createElement(data);
    this.initRowProperties(data);
    return this;
  }

  /**
   * 创建子组件
   */
  protected createChildWidget(childData: WidgetData): Widget | null {
    // 使用 Widget 静态方法动态创建组件
    return Widget.createWidget(childData);
  }

  /**
   * 绘制自身（Row通常不需要绘制背景）
   */
  protected paintSelf(context: BuildContext): void {
    // Row 组件本身不需要绘制任何内容，它只是一个布局容器
    // 子组件的绘制由基类的 paint 方法处理
  }

  /**
   * 执行布局计算
   */
  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    if (childrenSizes.length === 0) {
      // 没有子组件，返回最小尺寸
      return {
        width: constraints.minWidth,
        height: constraints.minHeight,
      };
    }

    // 计算子组件总宽度和最大高度
    let totalWidth = 0;
    let maxHeight = 0;

    for (let i = 0; i < childrenSizes.length; i++) {
      totalWidth += childrenSizes[i].width;
      maxHeight = Math.max(maxHeight, childrenSizes[i].height);

      // 添加间距（除了最后一个子组件）
      if (i < childrenSizes.length - 1) {
        totalWidth += this.spacing;
      }
    }

    // 根据主轴尺寸确定宽度
    let width = totalWidth;
    if (this.mainAxisSize === 'max') {
      // 在无界约束下保持由子元素决定的宽度
      width = isFinite(constraints.maxWidth)
        ? Math.max(totalWidth, constraints.maxWidth)
        : totalWidth;
    }

    // 确保满足约束条件
    width = Math.max(constraints.minWidth, Math.min(width, constraints.maxWidth));

    // 对于高度，Row 应该根据内容来确定，而不是使用无限约束
    // 这符合 Flutter 的行为：Row 的高度由其子组件的最大高度决定
    let height = maxHeight;

    // 如果约束的最大高度不是无限的，则需要考虑约束
    if (constraints.maxHeight !== Infinity) {
      height = Math.min(maxHeight, constraints.maxHeight);
    }

    // 确保满足最小高度约束
    height = Math.max(constraints.minHeight, height);

    return { width, height };
  }

  /**
   * 获取子组件的约束
   */
  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    // 根据交叉轴对齐方式确定子组件高度约束
    if (this.crossAxisAlignment === 'stretch') {
      // 拉伸子组件以填充整个高度
      return {
        minWidth: 0,
        maxWidth: Infinity,
        minHeight: constraints.maxHeight,
        maxHeight: constraints.maxHeight,
      };
    } else {
      // 子组件可以根据自己的内容决定高度
      return {
        minWidth: 0,
        maxWidth: constraints.maxWidth,
        minHeight: 0,
        maxHeight: constraints.maxHeight,
      };
    }
  }

  /**
   * 定位子组件
   */
  protected positionChild(childIndex: number, childSize: Size): Offset {
    const { offset, size } = this.renderObject;

    // 计算所有子组件的总宽度（包括间距）
    let totalChildrenWidth = 0;
    for (let i = 0; i < this.children.length; i++) {
      totalChildrenWidth += this.children[i].renderObject.size.width;
      if (i < this.children.length - 1) {
        totalChildrenWidth += this.spacing;
      }
    }

    // 计算起始X坐标（基于主轴对齐方式）
    let startX = 0;
    const availableSpace = size.width - totalChildrenWidth;

    switch (this.mainAxisAlignment) {
      case 'start':
        startX = 0;
        break;
      case 'center':
        startX = availableSpace / 2;
        break;
      case 'end':
        startX = availableSpace;
        break;
      case 'spaceBetween':
        startX = 0; // 会在下面的计算中分配空间
        break;
      case 'spaceAround':
        startX = availableSpace / (this.children.length * 2); // 会在下面的计算中分配空间
        break;
      case 'spaceEvenly':
        startX = availableSpace / (this.children.length + 1); // 会在下面的计算中分配空间
        break;
    }

    // 计算当前子组件的X坐标
    let xOffset = startX;
    for (let i = 0; i < childIndex; i++) {
      xOffset += this.children[i].renderObject.size.width;

      // 添加间距或分配额外空间
      if (i < this.children.length - 1) {
        switch (this.mainAxisAlignment) {
          case 'spaceBetween':
            if (this.children.length > 1) {
              xOffset += availableSpace / (this.children.length - 1);
            }
            break;
          case 'spaceAround':
            xOffset += availableSpace / this.children.length;
            break;
          case 'spaceEvenly':
            xOffset += availableSpace / (this.children.length + 1);
            break;
          default:
            xOffset += this.spacing;
            break;
        }
      }
    }

    // 计算Y坐标（基于交叉轴对齐方式）
    let yOffset = 0;
    switch (this.crossAxisAlignment) {
      case 'start':
        yOffset = 0;
        break;
      case 'center':
        yOffset = (size.height - childSize.height) / 2;
        break;
      case 'end':
        yOffset = size.height - childSize.height;
        break;
      case 'stretch':
        // 已经在约束中处理了拉伸
        yOffset = 0;
        break;
    }

    return { dx: xOffset, dy: yOffset };
  }
}

export type ExpandedProps = Omit<RowData, 'type' | 'children'> & JSXComponentProps;
export const RowElement: React.FC<ExpandedProps> = () => null;
