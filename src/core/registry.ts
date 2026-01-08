import { Widget, type WidgetConstructor, type WidgetProps } from './base';

export class WidgetRegistry {
  private static registry: Map<string, WidgetConstructor> = new Map();

  private widgets: Map<string, new (data: WidgetProps) => Widget> = new Map();

  // 注册组件类型
  public static registerType<T extends WidgetProps>(
    type: string,
    constructor: new (data: T) => Widget<T>,
  ): void {
    // 将具体构造函数安全提升为通用构造函数
    WidgetRegistry.registry.set(type, constructor as unknown as WidgetConstructor);
  }

  // 创建组件实例
  public static createWidget<TData extends WidgetProps = WidgetProps>(
    data: TData,
  ): Widget<TData> | null {
    if (!data) {
      console.error('createWidget: 组件数据为空或未定义');
      return null;
    }
    if (!data.type) {
      console.error('createWidget: 组件数据缺少 type 属性', data);
      return null;
    }

    const constructor = WidgetRegistry.registry.get(data.type);
    if (constructor) {
      try {
        return new constructor(data) as Widget<TData>;
      } catch (error) {
        console.error(`Failed to create widget of type ${data.type}:`, error, data);
        return null;
      }
    }
    console.warn(`Unknown widget type: ${data.type}`);
    return null;
  }

  // 动态注册类型查询
  public static hasRegisteredType(type: string): boolean {
    return WidgetRegistry.registry.has(type);
  }

  // 判断某类型是否为复合组件（Stateless/Stateful），用于事件绑定策略
  public static isCompositeType(type: string): boolean {
    const ctor = WidgetRegistry.registry.get(type);
    if (!ctor) {
      return false;
    }
    try {
      const proto = (ctor as unknown as { prototype?: Record<string, unknown> }).prototype;
      return !!proto && typeof (proto as Record<string, unknown>).render === 'function';
    } catch {
      return false;
    }
  }

  register(type: string, widgetClass: new (data: WidgetProps) => Widget): void {
    this.widgets.set(type, widgetClass);
  }

  create(type: string, data: WidgetProps): Widget | null {
    const WidgetClass = this.widgets.get(type);
    if (!WidgetClass) {
      console.warn(`Widget type "${type}" not found in registry`);
      return null;
    }
    return new WidgetClass(data);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.widgets.keys());
  }
}

// 创建全局注册表实例
export const widgetRegistry = new WidgetRegistry();

// 便捷函数
export function registerWidget(type: string, widgetClass: new (data: WidgetProps) => Widget): void {
  WidgetRegistry.registerType(type, widgetClass);
}

export function createWidget(type: string, data: WidgetProps): Widget | null {
  return WidgetRegistry.createWidget(data);
}
