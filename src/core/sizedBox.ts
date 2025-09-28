import { Widget } from "./base";
import type {
  WidgetData,
  BoxConstraints,
  Size,
  Offset,
  BuildContext,
} from "./base";

/**
 * SizedBox组件的数据接口
 */
export interface SizedBoxData extends WidgetData {
  type: "sizedbox";
  width?: number; // 固定宽度
  height?: number; // 固定高度
}

/**
 * SizedBox布局组件，为子组件提供固定尺寸
 * 类似于Flutter的SizedBox widget
 */
export class SizedBox extends Widget<SizedBoxData> {
  // 固定尺寸
  fixedWidth?: number;
  fixedHeight?: number;

  // 注册 SizedBox 组件类型
  static {
    Widget.registerType("sizedbox", SizedBox);
  }

  constructor(data: SizedBoxData) {
    super(data);
    this.initSizedBoxProperties(data);
  }

  /**
   * 初始化SizedBox特有属性
   */
  private initSizedBoxProperties(data: SizedBoxData): void {
    this.fixedWidth = data.width;
    this.fixedHeight = data.height;
  }

  /**
   * 创建组件实例
   */
  createElement(data: SizedBoxData): Widget<SizedBoxData> {
    return new SizedBox(data);
  }

  /**
   * 创建子组件
   */
  protected createChildWidget(childData: WidgetData): Widget | null {
    return Widget.createWidget(childData);
  }

  /**
   * 绘制自身（SizedBox通常不需要绘制背景）
   */
  protected paintSelf(context: BuildContext): void {
    // SizedBox组件通常不绘制自身，只负责为子组件提供固定尺寸
  }

  /**
   * 执行布局计算
   */
  protected performLayout(
    constraints: BoxConstraints,
    childrenSizes: Size[]
  ): Size {
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
    width = Math.max(
      constraints.minWidth,
      Math.min(width, constraints.maxWidth)
    );
    height = Math.max(
      constraints.minHeight,
      Math.min(height, constraints.maxHeight)
    );

    return { width, height };
  }

  /**
   * 获取子组件的约束
   */
  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number
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

    // 为子组件提供固定尺寸约束
    const childWidth = this.fixedWidth ?? constraints.maxWidth;
    const childHeight = this.fixedHeight ?? constraints.maxHeight;

    return {
      minWidth: this.fixedWidth ?? 0,
      maxWidth: childWidth,
      minHeight: this.fixedHeight ?? 0,
      maxHeight: childHeight,
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

  /**
   * 创建固定尺寸的SizedBox
   */
  static square(size: number, child?: WidgetData): SizedBoxData {
    return {
      type: "sizedbox",
      width: size,
      height: size,
      children: child ? [child] : undefined,
    };
  }

  /**
   * 创建固定宽度的SizedBox
   */
  static width(width: number, child?: WidgetData): SizedBoxData {
    return {
      type: "sizedbox",
      width: width,
      children: child ? [child] : undefined,
    };
  }

  /**
   * 创建固定高度的SizedBox
   */
  static height(height: number, child?: WidgetData): SizedBoxData {
    return {
      type: "sizedbox",
      height: height,
      children: child ? [child] : undefined,
    };
  }

  /**
   * 创建空的SizedBox（用作间距）
   */
  static shrink(): SizedBoxData {
    return {
      type: "sizedbox",
      width: 0,
      height: 0,
    };
  }

  /**
   * 创建扩展的SizedBox（填充可用空间）
   */
  static expand(child?: WidgetData): SizedBoxData {
    return {
      type: "sizedbox",
      width: Infinity,
      height: Infinity,
      children: child ? [child] : undefined,
    };
  }
}