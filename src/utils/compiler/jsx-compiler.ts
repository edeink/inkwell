import type { JSXElement } from './jsx-runtime';
import type { EventType } from '@/core/events/types';
import type { ComponentData } from '@/runtime';

import { Widget } from '@/core/base';
import { EventRegistry } from '@/core/events';
import { widgetRegistry } from '@/core/registry';
import { ComponentType } from '@/core/type';

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
  return Widget.hasRegisteredType(t) || widgetRegistry.getRegisteredTypes().includes(t);
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

export function compileElement(element: AnyElement): ComponentData {
  const anyEl = element as {
    type: unknown;
    props: Record<string, unknown> | null;
    key?: string | number | null;
  };
  const { type, props, key } = anyEl;
  const typeName = resolveTypeName(type);
  const isComposite = Widget.isCompositeType(typeName);
  const componentType: ComponentType = isValidType(typeName)
    ? (typeName as ComponentType)
    : (typeName as unknown as ComponentType);

  const data: ComponentData = {
    type: componentType,
    key: key ?? `${componentType}-${Math.random().toString(36).slice(2, 11)}`,
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
            EventRegistry.register(keyStr, type, v as any, { capture: cap });
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
