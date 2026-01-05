import { toEventType } from './helper';
import { EventRegistry } from './registry';

import type { Widget, WidgetProps } from '../base';
import type { EventHandler } from './types';

/**
 * DOM 事件管理器
 * 处理 Widget 的事件绑定逻辑，解析 'onEvent' 属性并注册到 EventRegistry。
 */
export class DOMEventManager {
  /**
   * 将组件属性中的事件监听器绑定到 EventRegistry。
   * 支持 toEventType 中定义的所有事件类型。
   *
   * @param widget 需要绑定事件的组件实例
   * @param data 包含潜在事件处理程序的属性/数据
   */
  static bindEvents(widget: Widget, data: WidgetProps): void {
    const rt = widget.runtime;
    if (!rt) {
      return;
    }

    // 始终清除该组件 key 的现有事件，以防止监听器陈旧
    // 这修复了删除所有事件属性时未清除注册表的潜在 bug
    EventRegistry.clearKey(String(widget.key), rt);

    // 遍历属性以查找事件处理程序
    for (const [k, v] of Object.entries(data)) {
      // 检查 on[Event] 模式
      if (typeof v === 'function' && /^on[A-Z]/.test(k)) {
        const base = k.replace(/^on/, '').replace(/Capture$/, '');
        const type = toEventType(base);

        if (type) {
          const capture = /Capture$/.test(k);
          EventRegistry.register(String(widget.key), type, v as EventHandler, { capture }, rt);
        }
      }
    }
  }
}
