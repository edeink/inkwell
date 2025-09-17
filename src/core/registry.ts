import { Widget, type WidgetData } from "./base";

// 组件构造函数类型
type WidgetConstructor = new (data: WidgetData) => Widget;

// 组件注册表
class WidgetRegistry {
  private static instance: WidgetRegistry;
  private registry: Map<string, WidgetConstructor> = new Map();

  private constructor() {}

  // 单例模式获取实例
  public static getInstance(): WidgetRegistry {
    if (!WidgetRegistry.instance) {
      WidgetRegistry.instance = new WidgetRegistry();
    }
    return WidgetRegistry.instance;
  }

  // 注册组件
  public register(type: string, constructor: WidgetConstructor): void {
    this.registry.set(type, constructor);
  }

  // 创建组件实例
  public createWidget(data: WidgetData): Widget | null {
    const constructor = this.registry.get(data.type);
    if (constructor) {
      return new constructor(data);
    }
    console.warn(`Unknown widget type: ${data.type}`);
    return null;
  }

  // 检查组件类型是否已注册
  public hasType(type: string): boolean {
    return this.registry.has(type);
  }
}

// 导出单例实例
export const widgetRegistry = WidgetRegistry.getInstance();

// 导出便捷的注册函数
export function registerWidget(
  type: string,
  constructor: WidgetConstructor
): void {
  widgetRegistry.register(type, constructor);
}
