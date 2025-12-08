/**
 * 事件注册表
 *
 * 模块功能说明：
 * - 以组件 key 为维度存储各事件类型的处理器列表。
 * - 支持捕获与冒泡阶段处理器的区分与顺序保存。
 *
 * 核心接口：
 * - register(key, type, handler, opts?): 注册处理器（可选 capture）。
 * - getHandlers(key, type): 获取某 key 在指定类型下的处理器列表。
 * - clearKey(key): 清除某组件 key 的所有事件处理器。
 * - clearAll(): 清除所有注册的事件。
 *
 * 使用注意事项：
 * - 在编译 JSX 时由编译器自动注册（见 utils/compiler/jsx-compiler.ts）。
 * - 重新编译同一 key 时建议先 clearKey 以避免旧处理器残留。
 */
import type { EventHandler, EventType, HandlerEntry } from './types';
import type Runtime from '@/runtime';

class EventRegistryImpl {
  private global: Map<string, Map<EventType, HandlerEntry[]>> = new Map();
  private byRuntime: WeakMap<Runtime, Map<string, Map<EventType, HandlerEntry[]>>> = new WeakMap();
  private currentRuntime: Runtime | null = null;

  setCurrentRuntime(rt: Runtime | null): void {
    this.currentRuntime = rt;
  }

  private getStore(rt?: Runtime | null): Map<string, Map<EventType, HandlerEntry[]>> {
    if (rt) {
      let store = this.byRuntime.get(rt);
      if (!store) {
        store = new Map<string, Map<EventType, HandlerEntry[]>>();
        this.byRuntime.set(rt, store);
      }
      return store;
    }
    return this.global;
  }

  register(
    key: string,
    type: EventType,
    handler: EventHandler,
    opts?: { capture?: boolean },
    rt?: Runtime | null,
  ): void {
    const store = this.getStore(rt ?? this.currentRuntime);
    const byType = store.get(key) ?? new Map<EventType, HandlerEntry[]>();
    const list = byType.get(type) ?? [];
    list.push({ handler, capture: !!opts?.capture });
    byType.set(type, list);
    store.set(key, byType);
  }

  getHandlers(key: string, type: EventType, rt?: Runtime | null): HandlerEntry[] {
    const store = this.getStore(rt ?? this.currentRuntime);
    const byType = store.get(key);
    if (!byType) {
      return [];
    }
    return byType.get(type) ?? [];
  }

  clearKey(key: string, rt?: Runtime | null): void {
    const store = this.getStore(rt ?? this.currentRuntime);
    store.delete(key);
  }

  clearAll(): void {
    this.global.clear();
    this.byRuntime = new WeakMap();
    this.currentRuntime = null;
  }

  clearRuntime(rt: Runtime): void {
    this.byRuntime.delete(rt);
  }
}

export const EventRegistry = new EventRegistryImpl();
