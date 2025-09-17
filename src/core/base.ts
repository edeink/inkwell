import { type IRenderer } from "../renderer/IRenderer";

/**
 * 基础组件类，提供构建、布局和绘制的基本方法
 * 参考 Flutter 的实现风格
 */
export interface WidgetData {
  key?: string;
  type: string;
  children?: WidgetData[];
  [key: string]: unknown;
}

export interface Constraints {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  [key: string]: number | undefined;
}

export interface Size {
  width: number;
  height: number;
}

export interface Offset {
  dx: number;
  dy: number;
}

export interface BoxConstraints extends Constraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

export interface EdgeInsets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface RenderObject {
  offset: Offset;
  size: Size;
  [key: string]: unknown;
}

export interface BuildContext {
  renderer: IRenderer; // 渲染器实例
  [key: string]: unknown;
}

/**
 * 创建默认的盒约束
 */
export function createBoxConstraints(
  options: Partial<BoxConstraints> = {}
): BoxConstraints {
  return {
    minWidth: options.minWidth ?? 0,
    maxWidth: options.maxWidth ?? Infinity,
    minHeight: options.minHeight ?? 0,
    maxHeight: options.maxHeight ?? Infinity,
  };
}

/**
 * 创建紧约束
 */
export function createTightConstraints(
  width: number,
  height: number
): BoxConstraints {
  return {
    minWidth: width,
    maxWidth: width,
    minHeight: height,
    maxHeight: height,
  };
}

/**
 * 基础组件类
 */
export abstract class Widget<TData extends WidgetData = WidgetData> {
  key: string;
  type: string;
  children: Widget[] = [];
  parent: Widget | null = null;
  data: TData;
  renderObject: RenderObject = {
    offset: { dx: 0, dy: 0 },
    size: { width: 0, height: 0 },
  };

  // 组件注册表 - 使用协变的构造函数类型
  private static registry: Map<string, new (data: any) => Widget> = new Map();

  // 注册组件类型
  public static registerType<T extends WidgetData>(
    type: string,
    constructor: new (data: T) => Widget<T>
  ): void {
    Widget.registry.set(type, constructor);
  }

  // 创建组件实例
  public static createWidget(data: WidgetData): Widget | null {
    const constructor = Widget.registry.get(data.type);
    if (constructor) {
      return new constructor(data);
    }
    console.warn(`Unknown widget type: ${data.type}`);
    return null;
  }

  constructor(data: TData) {
    this.key = data.key || `widget-${Math.random().toString(36).substr(2, 9)}`;
    this.type = data.type;
    this.data = { ...data };

    // 递归构建子组件
    if (data.children && Array.isArray(data.children)) {
      this.buildChildren(data.children);
    }
  }

  /**
   * 创建组件元素
   * 类似于 React 的 createElement 方法
   */
  createElement(data: TData): Widget<TData> {
    this.data = data;

    // 重新构建子组件
    if (data.children && data.children.length > 0) {
      this.buildChildren(data.children);
    }

    return this;
  }

  /**
   * 构建子组件
   */
  protected buildChildren(childrenData: WidgetData[]): void {
    // 清空现有子组件
    this.children = [];

    // 递归构建每个子组件
    for (const childData of childrenData) {
      const childWidget = this.createChildWidget(childData);
      if (childWidget) {
        childWidget.parent = this;
        this.children.push(childWidget);
      }
    }
  }

  /**
   * 创建子组件的抽象方法，由子类实现
   */
  protected abstract createChildWidget(childData: WidgetData): Widget | null;

  /**
   * 布局组件及其子组件
   * 类似于 Flutter 的 layout 方法
   */
  layout(constraints: BoxConstraints): Size {
    // 首先布局子组件
    const childrenSizes = this.layoutChildren(constraints);

    // 根据子组件布局结果计算自身布局
    const size = this.performLayout(constraints, childrenSizes);
    this.renderObject.size = size;

    return size;
  }

  /**
   * 布局子组件
   */
  protected layoutChildren(parentConstraints: BoxConstraints): Size[] {
    const sizes: Size[] = [];

    // 为每个子组件计算布局约束并执行布局
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const childConstraints = this.getConstraintsForChild(
        parentConstraints,
        i
      );
      const childSize = child.layout(childConstraints);

      // 设置子组件的位置
      const childOffset = this.positionChild(i, childSize);
      child.renderObject.offset = childOffset;

      sizes.push(childSize);
    }

    return sizes;
  }

  /**
   * 获取子组件的约束
   */
  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number
  ): BoxConstraints {
    // 默认实现，可由子类覆盖
    return constraints;
  }

  /**
   * 定位子组件
   */
  protected positionChild(childIndex: number, childSize: Size): Offset {
    // 默认实现，可由子类覆盖
    // 默认将子组件放在 (0,0) 位置
    return { dx: 0, dy: 0 };
  }

  /**
   * 执行布局计算
   * 类似于 Flutter 的 performLayout 方法
   */
  protected abstract performLayout(
    constraints: BoxConstraints,
    childrenSizes: Size[]
  ): Size;

  /**
   * 绘制组件及其子组件
   * 类似于 Flutter 的 paint 方法
   */
  paint(context: BuildContext): void {
    // 绘制自身
    this.paintSelf(context);

    // 递归绘制子组件
    for (const child of this.children) {
      // 保存当前上下文状态
      context.renderer?.save?.();

      // 应用子组件的偏移
      context.renderer?.translate?.(
        child.renderObject.offset.dx,
        child.renderObject.offset.dy
      );

      // 绘制子组件
      child.paint(context);

      // 恢复上下文状态
      context.renderer?.restore?.();
    }
  }

  /**
   * 绘制组件自身
   */
  protected abstract paintSelf(context: BuildContext): void;

  /**
   * 构建方法，类似于 Flutter 的 build 方法
   * 用于创建组件树
   */
  build(context: BuildContext): Widget {
    // 默认返回自身，子类可以覆盖此方法返回其他组件
    return this;
  }
}
