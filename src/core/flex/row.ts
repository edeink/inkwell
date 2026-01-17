import { Widget } from '../base';
import { CrossAxisAlignment, FlexFit, MainAxisAlignment, MainAxisSize } from '../type';

import type { BoxConstraints, BuildContext, Offset, Size, WidgetProps } from '../base';

/**
 * Row布局组件的数据接口
 */
export interface RowProps extends WidgetProps {
  mainAxisAlignment?: MainAxisAlignment;
  crossAxisAlignment?: CrossAxisAlignment;
  mainAxisSize?: MainAxisSize;
  spacing?: number;
}

/**
 * Row布局组件，水平排列子组件
 * 类似于Flutter的Row widget
 */
export class Row extends Widget<RowProps> {
  // 布局属性
  mainAxisAlignment: MainAxisAlignment = MainAxisAlignment.Start;
  crossAxisAlignment: CrossAxisAlignment = CrossAxisAlignment.Center;
  mainAxisSize: MainAxisSize = MainAxisSize.Max;
  spacing: number = 0;

  constructor(data: RowProps) {
    super(data);
    this.initRowProperties(data);
  }

  /**
   * 初始化Row特有属性
   */
  private initRowProperties(data: RowProps): void {
    // 默认开启点击穿透
    if (data.pointerEvent === undefined) {
      this.pointerEvent = 'none';
    }
    this.mainAxisAlignment = data.mainAxisAlignment || MainAxisAlignment.Start;
    this.crossAxisAlignment = data.crossAxisAlignment || CrossAxisAlignment.Center;
    this.mainAxisSize = data.mainAxisSize || MainAxisSize.Max;
    this.spacing = data.spacing || 0;
  }

  /**
   * 创建组件
   */
  createElement(data: RowProps): Widget {
    super.createElement(data);
    this.initRowProperties(data);
    return this;
  }

  /**
   * 绘制自身（Row通常不需要绘制背景）
   */
  protected paintSelf(_context: BuildContext): void {
    // Row 组件本身不需要绘制任何内容，它只是一个布局容器
    // 子组件的绘制由基类的 paint 方法处理
  }

  /**
   * 布局子组件
   * 重写以实现 Flex 布局算法
   */
  protected layoutChildren(parentConstraints: BoxConstraints): Size[] {
    const sizes: Size[] = new Array(this.children.length);
    const flexChildren: { index: number; flex: number; fit: FlexFit }[] = [];

    // 1. 布局非 Flex 子组件
    //    优先计算非 Flex 组件的尺寸，这些组件使用其固有尺寸（intrinsic size）
    //    同时收集 Flex 子组件的信息，以便后续分配剩余空间
    let totalNonFlexWidth = 0;

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      // 检查子组件是否有 flex 属性，且 flex 值大于 0
      if (child.flex && child.flex.flex !== undefined && child.flex.flex > 0) {
        flexChildren.push({
          index: i,
          flex: child.flex.flex,
          fit: child.flex.fit || FlexFit.Tight,
        });
        // Flex 子组件暂时不布局，先占位
        sizes[i] = { width: 0, height: 0 };
      } else {
        // 非 Flex 子组件：给予松散约束 (0 ~ max)
        // 它们只占据它们需要的空间
        const childConstraints = this.getConstraintsForChild(parentConstraints, i);
        sizes[i] = child.layout(childConstraints);
        totalNonFlexWidth += sizes[i].width;
      }
    }

    // 计算总间距
    // 间距只存在于组件之间，所以是 (n-1) * spacing
    const totalSpacing = Math.max(0, this.children.length - 1) * this.spacing;
    totalNonFlexWidth += totalSpacing;

    // 2. 计算剩余空间
    // 从父容器的最大宽度中减去非 Flex 组件和间距占用的宽度
    const maxWidth = parentConstraints.maxWidth;
    let remainingWidth = 0;
    if (isFinite(maxWidth)) {
      remainingWidth = Math.max(0, maxWidth - totalNonFlexWidth);
    } else {
      // 如果父容器宽度无限（如在滚动容器中），Expanded 组件无法计算具体宽度
      // 这种情况下通常应该报错或者设为 0
      remainingWidth = 0;
    }

    // 3. 布局 Flex 子组件
    // 根据 flex 系数分配剩余空间
    const totalFlex = flexChildren.reduce((acc, c) => acc + c.flex, 0);

    if (totalFlex > 0 && isFinite(maxWidth)) {
      const spacePerFlex = remainingWidth / totalFlex;

      for (const flexChild of flexChildren) {
        const index = flexChild.index;
        const child = this.children[index];
        // 计算当前 Flex 子组件应分得的宽度
        const flexSize = spacePerFlex * flexChild.flex;

        // 获取基础约束（主要为了继承父级的高度约束）
        const baseConstraints = this.getConstraintsForChild(parentConstraints, index);

        // 创建 Flex 约束
        // FlexFit.Tight (默认): 强制子组件宽度等于计算出的 flexSize (minWidth = maxWidth)
        // FlexFit.Loose: 子组件宽度最大为 flexSize，但可以更小 (minWidth = 0)
        const childConstraints: BoxConstraints = {
          ...baseConstraints,
          minWidth: flexChild.fit === FlexFit.Tight ? flexSize : 0,
          maxWidth: flexSize,
        };

        sizes[index] = child.layout(childConstraints);
      }
    } else if (flexChildren.length > 0) {
      // 边界情况：无剩余空间或父容器宽度无限
      // 强制所有 Flex 子组件宽度为 0，防止溢出或计算错误
      for (const flexChild of flexChildren) {
        const index = flexChild.index;
        const child = this.children[index];
        const baseConstraints = this.getConstraintsForChild(parentConstraints, index);
        const childConstraints: BoxConstraints = {
          ...baseConstraints,
          minWidth: 0,
          maxWidth: 0,
        };
        sizes[index] = child.layout(childConstraints);
      }
    }

    return sizes;
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
    _childIndex: number,
  ): BoxConstraints {
    // 根据交叉轴对齐方式确定子组件高度约束
    if (this.crossAxisAlignment === 'stretch' && constraints.maxHeight !== Infinity) {
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
    const { size } = this.renderObject;

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
