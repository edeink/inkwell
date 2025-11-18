import type {
  BoxConstraints,
  BuildContext,
  Offset,
  Size,
  WidgetData,
} from "./base";
import { Widget } from "./base";

export interface CenterData extends WidgetData {
  child?: WidgetData;
}

/**
 * Center 组件 - 将子组件在可用空间内居中
 */
export class Center extends Widget<CenterData> {
  // 注册 Center 组件类型
  static {
    Widget.registerType("Center", Center);
  }

  constructor(data: CenterData) {
    super(data);
  }

  createElement(data: CenterData): Widget {
    super.createElement(data);
    return this;
  }

  protected createChildWidget(childData: WidgetData): Widget | null {
    // Center 只能有一个子组件
    return Widget.createWidget(childData);
  }

  /**
   * Center 不需要绘制自己
   */
  protected paintSelf(context: BuildContext): void {
    // Center 组件不绘制任何内容
  }

  protected performLayout(
    constraints: BoxConstraints,
    childrenSizes: Size[]
  ): Size {
    // Center 组件尽可能占用所有可用空间
    return {
      width:
        constraints.maxWidth === Infinity
          ? childrenSizes[0]?.width || 0
          : constraints.maxWidth,
      height:
        constraints.maxHeight === Infinity
          ? childrenSizes[0]?.height || 0
          : constraints.maxHeight,
    };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number
  ): BoxConstraints {
    // 子组件可以使用任意尺寸，但不能超过父组件的约束
    return {
      minWidth: 0,
      maxWidth: constraints.maxWidth,
      minHeight: 0,
      maxHeight: constraints.maxHeight,
    };
  }

  protected positionChild(childIndex: number, childSize: Size): Offset {
    // 计算居中位置
    const parentSize = this.renderObject.size;

    const dx = (parentSize.width - childSize.width) / 2;
    const dy = (parentSize.height - childSize.height) / 2;

    return { dx, dy };
  }
}
