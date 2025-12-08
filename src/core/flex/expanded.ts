import { Widget } from '../base';
import { ComponentType } from '../type';

import { FlexFit } from './type';

import type { BoxConstraints, BuildContext, Offset, Size, WidgetData, WidgetProps } from '../base';

export interface ExpandedData extends WidgetData {
  child: WidgetData;
}

/**
 * Expanded组件 - 为子组件提供flex约束
 *
 * Expanded组件必须作为Column、Row或Flex的直接子组件使用。
 * 它会让子组件在主轴方向上扩展以填充可用空间。
 */
export class Expanded extends Widget<ExpandedData> {
  flexValue: number = 1;
  flexFit: FlexFit = FlexFit.Tight;
  child: Widget | null = null;

  static {
    Widget.registerType(ComponentType.Expanded, Expanded);
  }

  constructor(data: ExpandedData) {
    super(data);
    this.initExpandedProperties(data);
  }

  private initExpandedProperties(data: ExpandedData): void {
    // 从统一的flex属性中获取值
    if (data.flex?.flex !== undefined) {
      this.flexValue = data.flex.flex;
    }
    if (data.flex?.fit !== undefined) {
      this.flexFit = data.flex.fit;
    }
  }

  createElement(data: ExpandedData): Widget<ExpandedData> {
    super.createElement(data);
    this.initExpandedProperties(data);
    this.child = this.children[0] ?? null;
    return this;
  }

  protected createChildWidget(childData: WidgetData): Widget | null {
    // 使用 Widget 静态方法动态创建组件
    return Widget.createWidget(childData);
  }

  protected paintSelf(context: BuildContext): void {
    // Expanded本身不绘制任何内容，只是一个布局容器
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    if (childrenSizes.length === 0) {
      return {
        width: constraints.minWidth,
        height: constraints.minHeight,
      };
    }

    // Expanded组件直接使用传入的约束
    // 这些约束应该已经由父级的flex布局系统计算好了
    const childSize = childrenSizes[0];

    return {
      width: Math.max(childSize.width, constraints.minWidth),
      height: Math.max(childSize.height, constraints.minHeight),
    };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    // Expanded将父级约束直接传递给子组件
    return constraints;
  }

  protected positionChild(childIndex: number, childSize: Size): Offset {
    // 子组件位于左上角
    return { dx: 0, dy: 0 };
  }
}

export type RowProps = Omit<ExpandedData, 'type' | 'children'> & WidgetProps;
export const ExpandedElement: React.FC<RowProps> = () => null;
