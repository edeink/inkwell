import { toEventType } from './helper';
import { EventRegistry } from './registry';

import type { Widget } from '../base';
import type { WidgetProps } from '../type';
import type { EventHandler, EventType } from './types';

// 扩展 Widget 类型以包含内部缓存事件属性
interface WidgetWithEvents extends Widget {
  _cachedEvents?: Record<string, { type: EventType; handler: EventHandler; capture: boolean }>;
}

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

    // 提取新事件处理程序
    // 优化：优先使用编译器预处理的 __events 属性，避免运行时遍历
    let newHandlers: Record<
      string,
      { type: EventType; handler: EventHandler; capture: boolean }
    > | null = null;
    let hasEvents = false;

    if (data['__events']) {
      newHandlers = data['__events'] as Record<
        string,
        { type: EventType; handler: EventHandler; capture: boolean }
      >;
      hasEvents = true;
    } else if (data['__noEvents']) {
      // 明确标记无事件，跳过遍历
    } else {
      for (const k in data) {
        const v = data[k];
        if (
          typeof v === 'function' &&
          k.length > 2 &&
          k.charCodeAt(0) === 111 &&
          k.charCodeAt(1) === 110
        ) {
          const charCode = k.charCodeAt(2);
          if (charCode >= 65 && charCode <= 90) {
            const base = k.slice(2).replace(/Capture$/, '');
            const type = toEventType(base);
            if (type) {
              if (!newHandlers) {
                newHandlers = {};
              }
              const capture = k.endsWith('Capture');
              newHandlers[type + (capture ? '_capture' : '')] = {
                type,
                handler: v as EventHandler,
                capture,
              };
              hasEvents = true;
            }
          }
        }
      }
    }

    // 检查是否与缓存的事件处理程序相同
    const cached = (widget as WidgetWithEvents)._cachedEvents;

    // 优化：如果既没有新事件也没有缓存事件，直接返回
    if (!hasEvents && !cached) {
      return;
    }

    // 如果没有新事件，且缓存为空（或不存在），直接返回
    // 优化：避免 Object.keys 调用
    if (!hasEvents && cached) {
      let isEmpty = true;
      for (const _ in cached) {
        isEmpty = false;
        break;
      }
      if (isEmpty) {
        return;
      }
    }

    if (cached && newHandlers) {
      let changed = false;
      // 优化：避免 Object.keys，直接遍历 key

      // 1. 检查新事件是否在缓存中且处理函数一致
      for (const key in newHandlers) {
        if (!cached[key] || cached[key].handler !== newHandlers[key].handler) {
          changed = true;
          break;
        }
      }

      // 2. 如果第一步没发现变化，检查缓存中的事件是否在新事件中（检查是否有删除）
      if (!changed) {
        for (const key in cached) {
          if (!newHandlers[key]) {
            changed = true;
            break;
          }
        }
      }

      if (!changed) {
        return;
      }
    } else if (!cached && !newHandlers) {
      // Should be covered by early return, but for safety
      return;
    }

    // 更新缓存
    (widget as WidgetWithEvents)._cachedEvents = newHandlers || {};

    // 始终清除该组件 key 的现有事件，以防止监听器陈旧
    // 优化：仅当确实有旧事件需要清除时才调用（虽然 clearKey 内部可能已处理，但减少调用总是好的）
    // 不过 EventRegistry.clearKey 实现未知，假设它很快。
    EventRegistry.clearKey(String(widget.key), rt);

    // 注册新事件
    if (newHandlers) {
      for (const key in newHandlers) {
        const { type, handler, capture } = newHandlers[key];
        EventRegistry.register(String(widget.key), type, handler, { capture }, rt);
      }
    }
  }
}
