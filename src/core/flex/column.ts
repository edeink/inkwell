import React from 'react';

import { Widget } from '../base';
import { ComponentType } from '../type';

import { createRenderFlexUnboundedError } from './errors';
import { CrossAxisAlignment, FlexFit, MainAxisAlignment, MainAxisSize } from './type';

import type {
  BoxConstraints,
  BuildContext,
  JSXComponentProps,
  Offset,
  Size,
  WidgetData,
} from '../base';

/**
 * Column布局组件的数据接口
 */
export interface ColumnData extends WidgetData {
  mainAxisAlignment?: MainAxisAlignment;
  crossAxisAlignment?: CrossAxisAlignment;
  mainAxisSize?: MainAxisSize;
  spacing?: number;
}

/**
 * Column布局组件，垂直排列子组件
 * 类似于Flutter的Column widget
 */
export class Column extends Widget<ColumnData> {
  // 布局属性
  mainAxisAlignment: MainAxisAlignment = MainAxisAlignment.Start;
  crossAxisAlignment: CrossAxisAlignment = CrossAxisAlignment.Center;
  mainAxisSize: MainAxisSize = MainAxisSize.Max;
  spacing: number = 0;

  constructor(data: ColumnData) {
    super(data);
    this.initColumnProperties(data);
  }

  /**
   * 初始化Column特有属性
   */
  private initColumnProperties(data: ColumnData): void {
    this.mainAxisAlignment = data.mainAxisAlignment || MainAxisAlignment.Start;
    this.crossAxisAlignment = data.crossAxisAlignment || CrossAxisAlignment.Center;
    this.mainAxisSize = data.mainAxisSize || MainAxisSize.Max;
    this.spacing = data.spacing || 0;
  }

  /**
   * 创建组件
   */
  createElement(data: ColumnData): Widget {
    super.createElement(data);
    this.initColumnProperties(data);
    return this;
  }

  /**
   * 创建子组件
   */
  protected createChildWidget(childData: WidgetData): Widget | null {
    // 使用 Widget 静态方法动态创建组件
    return Widget.createWidget(childData);
  }

  // 注册 Column 组件类型
  static {
    Widget.registerType(ComponentType.Column, Column);
  }

  /**
   * 绘制组件
   */
  protected paintSelf(context: BuildContext): void {
    // Column 组件本身不需要绘制任何内容，它只是一个布局容器
    // 子组件的绘制由基类的 paint 方法处理
  }

  /**
   * 执行布局计算 - Flutter风格的flex布局
   */
  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    if (childrenSizes.length === 0) {
      // 没有子组件，返回最小尺寸
      return {
        width: constraints.minWidth,
        height: constraints.minHeight,
      };
    }

    // 检查是否有无限高度约束
    const hasUnboundedHeight = !isFinite(constraints.maxHeight);

    // 分析子组件的flex属性
    const flexChildren: { index: number; flex: number; fit: FlexFit }[] = [];
    const nonFlexChildren: { index: number; size: Size }[] = [];
    let totalFlexWeight = 0;
    let totalNonFlexHeight = 0;
    let maxWidth = 0;

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const childSize = childrenSizes[i];
      maxWidth = Math.max(maxWidth, childSize.width);

      if (child.flex && child.flex.flex && child.flex.flex > 0) {
        // 有flex权重的子组件
        const flex = child.flex.flex;
        const fit = child.flex.fit || FlexFit.Tight;
        flexChildren.push({ index: i, flex, fit });
        totalFlexWeight += flex;
      } else {
        // 固定尺寸的子组件
        totalNonFlexHeight += childSize.height;
        nonFlexChildren.push({
          index: i,
          size: { width: childSize.width, height: childSize.height },
        });
      }

      // 添加间距（除了最后一个子组件）
      if (i < this.children.length - 1) {
        totalNonFlexHeight += this.spacing;
      }
    }

    // 检查Flutter风格的错误：如果有无限高度约束且有flex子组件，则抛出错误
    if (hasUnboundedHeight && flexChildren.length > 0 && this.mainAxisSize === 'max') {
      throw createRenderFlexUnboundedError('vertical');
    }

    // 计算可用于flex分配的空间
    let availableFlexSpace = constraints.maxHeight - totalNonFlexHeight;
    if (availableFlexSpace < 0) {
      availableFlexSpace = 0;
    }

    // 为flex子组件分配空间
    for (const flexChild of flexChildren) {
      const allocatedHeight = (availableFlexSpace * flexChild.flex) / totalFlexWeight;
      const childSize = childrenSizes[flexChild.index];

      // 更新子组件尺寸
      if (flexChild.fit === FlexFit.Tight) {
        // Expanded行为：强制占满分配的空间
        childSize.height = allocatedHeight;
      } else {
        // Flexible行为：可以小于分配的空间
        childSize.height = Math.min(childSize.height, allocatedHeight);
      }
    }

    // 重新计算总高度
    let totalHeight = 0;
    for (let i = 0; i < childrenSizes.length; i++) {
      totalHeight += childrenSizes[i].height;
      if (i < childrenSizes.length - 1) {
        totalHeight += this.spacing;
      }
    }

    // 根据主轴尺寸确定高度
    let height = totalHeight;
    if (this.mainAxisSize === 'max') {
      // 在无界约束下保持由子元素决定的高度
      height = isFinite(constraints.maxHeight)
        ? Math.max(totalHeight, constraints.maxHeight)
        : totalHeight;
    }

    // 确保满足约束条件
    height = Math.max(constraints.minHeight, Math.min(height, constraints.maxHeight));
    let width = Math.max(constraints.minWidth, Math.min(maxWidth, constraints.maxWidth));

    // 确保Column的宽度至少能容纳最宽的子组件
    if (maxWidth > width) {
      width = Math.min(maxWidth, constraints.maxWidth);
    }

    return { width, height };
  }

  /**
   * 获取子组件的约束
   */
  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    // 根据交叉轴对齐方式确定子组件宽度约束
    if (this.crossAxisAlignment === 'stretch') {
      // 拉伸子组件以填充整个宽度
      return {
        minWidth: constraints.maxWidth,
        maxWidth: constraints.maxWidth,
        minHeight: 0,
        maxHeight: constraints.maxHeight, // 传递父级的高度约束
      };
    } else {
      // 子组件可以根据自己的内容决定宽度
      return {
        minWidth: 0,
        maxWidth: constraints.maxWidth,
        minHeight: 0,
        maxHeight: constraints.maxHeight, // 传递父级的高度约束
      };
    }
  }

  /**
   * 定位子组件
   */
  protected positionChild(childIndex: number, childSize: Size): Offset {
    const { size } = this.renderObject;

    // 确保 childIndex 在有效范围内
    if (childIndex < 0 || childIndex >= this.children.length) {
      console.warn(
        `Column: Invalid childIndex ${childIndex}, children length: ${this.children.length}`,
      );
      return { dx: 0, dy: 0 };
    }

    // 计算所有子组件的总高度（包括间距）- 使用实际渲染尺寸
    let totalChildrenHeight = 0;
    for (let i = 0; i < this.children.length; i++) {
      totalChildrenHeight += this.children[i].renderObject.size.height;
      if (i < this.children.length - 1) {
        totalChildrenHeight += this.spacing;
      }
    }

    // 计算起始Y坐标（基于主轴对齐方式）
    let startY = 0;
    const availableSpace = Math.max(0, size.height - totalChildrenHeight);

    switch (this.mainAxisAlignment) {
      case 'start':
        startY = 0;
        break;
      case 'center':
        startY = availableSpace / 2;
        break;
      case 'end':
        startY = availableSpace;
        break;
      case 'spaceBetween':
        startY = 0; // 会在下面的计算中分配空间
        break;
      case 'spaceAround':
        startY = availableSpace / (this.children.length * 2); // 会在下面的计算中分配空间
        break;
      case 'spaceEvenly':
        startY = availableSpace / (this.children.length + 1); // 会在下面的计算中分配空间
        break;
    }

    // 计算当前子组件的Y坐标 - 使用实际渲染尺寸
    let yOffset = startY;
    for (let i = 0; i < childIndex; i++) {
      const prevChildSize = this.children[i].renderObject.size;
      yOffset += prevChildSize.height; // 使用实际渲染后的高度

      // 添加间距或分配额外空间
      if (i < this.children.length - 1) {
        switch (this.mainAxisAlignment) {
          case 'spaceBetween':
            if (this.children.length > 1) {
              yOffset += availableSpace / (this.children.length - 1);
            }
            break;
          case 'spaceAround':
            yOffset += availableSpace / this.children.length;
            break;
          case 'spaceEvenly':
            yOffset += availableSpace / (this.children.length + 1);
            break;
          default:
            yOffset += this.spacing;
            break;
        }
      }
    }

    // 计算X坐标（基于交叉轴对齐方式）
    let xOffset = 0;
    switch (this.crossAxisAlignment) {
      case 'start':
        xOffset = 0;
        break;
      case 'center':
        xOffset = (size.width - childSize.width) / 2;
        break;
      case 'end':
        xOffset = size.width - childSize.width;
        break;
      case 'stretch':
        // 已经在约束中处理了拉伸
        xOffset = 0;
        break;
    }

    const result = { dx: xOffset, dy: yOffset };

    // 添加调试日志
    if (this.children[childIndex]?.key === 'demo-footer') {
      console.log(`Column positioning demo-footer (index ${childIndex}):`, {
        childSize,
        totalChildrenHeight,
        availableSpace,
        startY,
        yOffset,
        xOffset,
        result,
        columnSize: size,
        mainAxisAlignment: this.mainAxisAlignment,
      });
    }

    return result;
  }
}

export type ColumnProps = Omit<ColumnData, 'type' | 'children'> & JSXComponentProps;
export const ColumnElement: React.FC<ColumnProps> = () => null;
