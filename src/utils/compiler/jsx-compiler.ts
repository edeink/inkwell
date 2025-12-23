import type { JSXElement } from './jsx-runtime';
import type { ComponentData } from '@/runtime';

import { Widget } from '@/core/base';
import { EventRegistry } from '@/core/events';
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
  const name = (type as { name?: string }).name ?? String(type);
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
  const isFn = typeof type === 'function';
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

// TODO 此方法应该提前到编译阶段，而不是运行时
export function compileElement(element: AnyElement): ComponentData {
  const maybeData = element as unknown as ComponentData;
  if (
    maybeData &&
    typeof maybeData === 'object' &&
    typeof maybeData.type === 'string' &&
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
  const typeName = resolveTypeName(type);
  autoRegisterIfNeeded(type, typeName);
  const isComposite = WidgetRegistry.isCompositeType(typeName);
  const componentType: ComponentType = isValidType(typeName)
    ? (typeName as ComponentType)
    : (typeName as unknown as ComponentType);

  const data: ComponentData = {
    type: componentType,
    key: key,
  } as ComponentData;

  const p = (props ?? {}) as Record<string, unknown>;
  const target = data as unknown as Record<string, unknown>;
  const keyStr = String(data.key ?? '');

  // 清理旧的注册，避免同 key 累积旧处理器
  try {
    EventRegistry.clearKey(keyStr);
  } catch {}

  for (const [k, v] of Object.entries(p)) {
    if (k === 'children' || k === 'key' || k === 'type') {
      continue;
    }
    if (v === undefined) {
      continue;
    }
    if (typeof v === 'function') {
      if (!isComposite) {
        const cap = /Capture$/.test(k);
        const base = k.replace(/^on/, '').replace(/Capture$/, '');
        const type = toEventType(base);
        if (type) {
          try {
            EventRegistry.register(keyStr, type, v as EventHandler, { capture: cap });
          } catch {}
        }
      }
      // 同步到数据对象，便于后续构建阶段复用
      target[k] = v as unknown;
      continue;
    }
    target[k] = v as unknown;
  }

  const children = toArrayChildren(p.children);
  if (children.length > 0) {
    data.children = children.map((c) => compileElement(c));
  }

  return data;
}

export function compileTemplate(template: () => AnyElement): ComponentData {
  const el = template();
  return compileElement(el);
}

function toEventType(base: string): EventType | null {
  const lower = base.toLowerCase();
  const map: Record<string, EventType> = {
    click: 'click',
    mousedown: 'mousedown',
    mouseup: 'mouseup',
    mousemove: 'mousemove',
    mouseover: 'mouseover',
    mouseout: 'mouseout',
    wheel: 'wheel',
    dblclick: 'dblclick',
    doubleclick: 'dblclick',
    contextmenu: 'contextmenu',
    pointerdown: 'pointerdown',
    pointerup: 'pointerup',
    pointermove: 'pointermove',
    pointerover: 'pointerover',
    pointerout: 'pointerout',
    pointerenter: 'pointerenter',
    pointerleave: 'pointerleave',
    touchstart: 'touchstart',
    touchmove: 'touchmove',
    touchend: 'touchend',
    touchcancel: 'touchcancel',
    keydown: 'keydown',
    keyup: 'keyup',
    keypress: 'keypress',
  };
  return map[lower] ?? null;
}
