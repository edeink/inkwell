import { Widget } from './base';

// 导入所有组件以确保它们被注册
import './center';
import './container';
import './flex/column';
import './flex/expanded';
import './flex/row';
import './image';
import './next-text';
import './padding';
import './positioned';
import './sized-box';
import './stack';
import './text';

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
export function registerWidget(type: string, widgetClass: new (data: any) => Widget): void {
  widgetRegistry.register(type, widgetClass);
}

export function createWidget(type: string, data: any): Widget | null {
  return widgetRegistry.create(type, data);
}

// 导入并注册所有组件
import { Center } from './center';
import { Container } from './container';
import { Padding } from './padding';
import { Positioned } from './positioned';
import { Stack } from './stack';

// 注册所有组件
registerWidget('container', Container);
registerWidget('padding', Padding);
registerWidget('center', Center);
registerWidget('stack', Stack);
registerWidget('positioned', Positioned);
