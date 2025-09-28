import { Widget, type WidgetData } from "./base";

export class WidgetRegistry {
  private widgets: Map<string, new (data: any) => Widget> = new Map();

  register(type: string, widgetClass: new (data: any) => Widget): void {
    this.widgets.set(type, widgetClass);
  }

  create(type: string, data: any): Widget | null {
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
export function registerWidget(
  type: string,
  widgetClass: new (data: any) => Widget
): void {
  widgetRegistry.register(type, widgetClass);
}

export function createWidget(type: string, data: any): Widget | null {
  return widgetRegistry.create(type, data);
}

// 导入并注册所有组件
import { Container } from "./container";
import { Padding } from "./padding";
import { Center } from "./center";
import { Stack } from "./stack";
import { Positioned } from "./positioned";

// 注册所有组件
registerWidget("container", Container);
registerWidget("padding", Padding);
registerWidget("center", Center);
registerWidget("stack", Stack);
registerWidget("positioned", Positioned);

// 导入所有组件以自动注册
import "./flex/column"; // 自动注册 Column 组件
import "./flex/row"; // 自动注册 Row 组件
import "./text"; // 自动注册 Text 组件
import "./image"; // 自动注册 Image 组件
import "./sizedbox"; // 自动注册 SizedBox 组件
import "./container"; // 自动注册 Container 组件
import "./padding"; // 自动注册 Padding 组件
import "./center"; // 自动注册 Center 组件
import "./stack"; // 自动注册 Stack 组件
import "./positioned"; // 自动注册 Positioned 组件
