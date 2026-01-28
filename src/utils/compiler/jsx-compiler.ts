import type { JSXElement } from './jsx-runtime';
import type { ComponentData } from '@/runtime';

import { Widget } from '@/core/base';
import {
  CAPTURE_KEY_SUFFIX,
  CAPTURE_SUFFIX,
  EVENT_HANDLER_PROP_PREFIX,
  EVENT_PROP_EVENTS,
  EVENT_TYPE_FROM_BASE,
  TYPEOF_FUNCTION,
} from '@/core/events/constants';
import { WidgetRegistry, widgetRegistry } from '@/core/registry';
import { ComponentType, type EventHandler, type EventType, type WidgetProps } from '@/core/type';

/**
 * JSX 编译器：将自定义 JSX 运行时元素转换为 ComponentData JSON
 * 兼容 React JSX 与自定义运行时生成的元素对象
 */

export type AnyElement =
  | JSXElement
  | (React.ReactElement & { type: unknown; props: unknown; key?: unknown });

function resolveTypeName(type: unknown): string {
  const typeObj = type as { name?: string } | null | undefined;
  const name = typeObj?.name ?? String(type);
  // 将 *Element 结尾的函数组件名映射为真实组件类型名
  if (name.endsWith('Element')) {
    return name.slice(0, -'Element'.length);
  }
  return name;
}

function isValidType(t: string): boolean {
  return WidgetRegistry.hasRegisteredType(t) || widgetRegistry.getRegisteredTypes().includes(t);
}

function autoRegisterIfNeeded(type: unknown, typeName: string): void {
  const isFn = typeof type === TYPEOF_FUNCTION;
  if (!isFn) {
    return;
  }
  const proto = (type as { prototype?: unknown }).prototype as object | undefined;
  const isWidgetSubclass = !!proto && Object.prototype.isPrototypeOf.call(Widget.prototype, proto);
  if (!isWidgetSubclass) {
    return;
  }
  if (WidgetRegistry.hasRegisteredType(typeName)) {
    return;
  }
  try {
    WidgetRegistry.registerType(typeName, type as new (data: WidgetProps) => Widget);
  } catch {}
}

function toArrayChildren(children: unknown): AnyElement[] {
  const out: AnyElement[] = [];
  function collect(c: unknown): void {
    if (!c) {
      return;
    }
    if (Array.isArray(c)) {
      for (const it of c) {
        collect(it);
      }
      return;
    }
    if (typeof c === 'object') {
      out.push(c as AnyElement);
    }
  }
  collect(children);
  return out;
}

function toEventType(base: string): EventType | null {
  const lower = base.toLowerCase();
  return EVENT_TYPE_FROM_BASE[lower] ?? null;
}

// TODO 此方法应该提前到编译阶段，而不是运行时
export function compileElement(element: AnyElement): ComponentData {
  const maybeData = element as unknown as ComponentData;
  if (
    maybeData &&
    typeof maybeData === 'object' &&
    typeof maybeData.__inkwellType === 'string' &&
    !('props' in (element as unknown as Record<string, unknown>))
  ) {
    return maybeData;
  }
  const anyEl = element as {
    type: unknown;
    props: Record<string, unknown> | null;
    key?: string | number | null;
  };
  const { type, props, key } = anyEl;

  // 支持函数式组件 (Functional Component)
  if (typeof type === TYPEOF_FUNCTION) {
    // 检查是否是类组件
    const proto = (type as { prototype?: { render?: unknown } }).prototype;
    const isWidget = !!proto && Object.prototype.isPrototypeOf.call(Widget.prototype, proto);
    const hasRender = !!proto && !!proto.render;
    const isClass = isWidget || hasRender;

    if (!isClass) {
      // 如果不是 Widget 子类，则视为函数式组件，直接执行展开
      try {
        // 将 key 合并入 props，虽然 React 通常不这样做，但在某些简易实现中可能需要
        // 或者保持 React 惯例，key 不在 props 中。这里 props 已经是 Record<string, unknown>
        const fn = type as (props: unknown) => AnyElement;
        const rendered = fn({ ...(props ?? {}), key });
        return compileElement(rendered);
      } catch (e) {
        console.error(`Error rendering functional component ${resolveTypeName(type)}:`, e);
        // 返回一个错误占位或空对象
        return {
          __inkwellType: 'Container' as ComponentType,
          children: [],
        } as unknown as ComponentData;
      }
    }
  }

  const typeName = resolveTypeName(type);
  autoRegisterIfNeeded(type, typeName);
  const isComposite = WidgetRegistry.isCompositeType(typeName);
  const componentType: ComponentType = isValidType(typeName)
    ? (typeName as ComponentType)
    : (typeName as unknown as ComponentType);

  const data: ComponentData = {
    __inkwellType: componentType,
    key: key,
  } as ComponentData;

  const p = (props ?? {}) as Record<string, unknown>;
  const target = data as unknown as Record<string, unknown>;

  let events:
    | Record<string, { type: EventType; handler: EventHandler; capture: boolean }>
    | undefined;
  let hasEvents = false;

  // 优化：使用 for...in 替代 Object.entries 以减少数组分配
  for (const k in p) {
    if (k === 'children' || k === 'key' || k === '__inkwellType') {
      continue;
    }
    const v = p[k];
    if (v === undefined) {
      continue;
    }
    if (typeof v === TYPEOF_FUNCTION) {
      if (!isComposite) {
        // 快速检查是否以 on 开头，避免不必要的正则
        if (k.startsWith(EVENT_HANDLER_PROP_PREFIX) && k.length > 2) {
          const cap = k.endsWith(CAPTURE_SUFFIX);
          const base = k.substring(2, cap ? k.length - CAPTURE_SUFFIX.length : k.length);
          const type = toEventType(base);
          if (type) {
            const eventKey = type + (cap ? CAPTURE_KEY_SUFFIX : '');
            if (!events) {
              events = {};
            }
            events[eventKey] = {
              type,
              handler: v as EventHandler,
              capture: cap,
            };
            hasEvents = true;
          }
        }
      }
      // 同步到数据对象，便于后续构建阶段复用
      target[k] = v as unknown;
      continue;
    }
    target[k] = v as unknown;
  }

  if (hasEvents && events) {
    data[EVENT_PROP_EVENTS] = events as unknown;
  }

  const children = toArrayChildren(p.children);
  if (children.length > 0) {
    // 优化：预分配数组
    const len = children.length;
    const compiledChildren = new Array(len);
    for (let i = 0; i < len; i++) {
      compiledChildren[i] = compileElement(children[i]);
    }
    data.children = compiledChildren;
  }

  return data;
}

export const compileTemplate = compileElement;
