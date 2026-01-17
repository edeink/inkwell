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
    const cap = !!opts?.capture;
    const filtered = list.filter((h) => h.capture !== cap);
    filtered.push({ handler, capture: cap });
    byType.set(type, filtered);
    store.set(key, byType);
  }

  getHandlers(key: string, type: EventType, rt?: Runtime | null): HandlerEntry[] {
    const targetRuntime = rt ?? this.currentRuntime;
    const store = this.getStore(targetRuntime);
    const byType = store.get(key);
    const local = byType?.get(type) ?? [];

    // 如果指定了运行时，还需要合并全局注册的处理器（如 JSX 编译产生的）
    if (targetRuntime) {
      const globalByType = this.global.get(key);
      const globalHandlers = globalByType?.get(type) ?? [];
      // 避免重复（虽然目前的设计 global 和 runtime store 是隔离的，但为了保险）
      // 这里简单合并，优先执行 global (通常是 props)，然后是 runtime dynamic?
      // 或者保持注册顺序？
      // 目前实现：简单的数组合并，并去重
      const merged = [...globalHandlers, ...local];
      const unique: HandlerEntry[] = [];
      const seen = new Set<EventHandler>();

      for (const entry of merged) {
        if (!seen.has(entry.handler)) {
          seen.add(entry.handler);
          unique.push(entry);
        }
      }
      return unique;
    }

    return local;
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
