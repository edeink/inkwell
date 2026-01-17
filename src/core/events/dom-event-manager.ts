import {
  CAPTURE_KEY_SUFFIX,
  CAPTURE_SUFFIX,
  EVENT_HANDLER_PROP_PREFIX,
  EVENT_PROP_EVENTS,
  isFunction,
} from './constants';
import { toEventType } from './helper';
import { EventRegistry } from './registry';

import type { Widget } from '../base';
import type { WidgetProps } from '../type';
import type { EventHandler, EventType } from './types';

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
    const rt = widget.runtime ?? null;
    const key = String(widget.key);

    type HandlerMap = Record<string, { type: EventType; handler: EventHandler; capture: boolean }>;
    let handlers: HandlerMap | null = null;

    if (data[EVENT_PROP_EVENTS]) {
      handlers = data[EVENT_PROP_EVENTS] as HandlerMap;
    } else {
      const captureSuffixRe = new RegExp(`${CAPTURE_SUFFIX}$`);
      for (const k in data) {
        const v = data[k];
        if (!isFunction(v)) {
          continue;
        }
        if (k.length <= 2 || !k.startsWith(EVENT_HANDLER_PROP_PREFIX)) {
          continue;
        }
        const third = k.charCodeAt(2);
        if (third < 65 || third > 90) {
          continue;
        }
        const base = k.slice(2).replace(captureSuffixRe, '');
        const type = toEventType(base);
        if (!type) {
          continue;
        }
        if (!handlers) {
          handlers = {};
        }
        const capture = k.endsWith(CAPTURE_SUFFIX);
        handlers[type + (capture ? CAPTURE_KEY_SUFFIX : '')] = {
          type,
          handler: v as EventHandler,
          capture,
        };
      }
    }

    EventRegistry.clearKey(key, rt);
    if (!handlers) {
      return;
    }
    for (const k in handlers) {
      const { type, handler, capture } = handlers[k];
      EventRegistry.register(key, type, handler, { capture }, rt);
    }
  }
}
