import type { JSXElement } from './jsx-runtime';
import type { ComponentData } from '@/runtime';

import { Widget } from '@/core/base';
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
  const componentType: ComponentType = isValidType(typeName)
    ? (typeName as ComponentType)
    : (typeName as unknown as ComponentType);

  const data: ComponentData = {
    type: componentType,
    key: key ?? `${componentType}-${Math.random().toString(36).slice(2, 11)}`,
  } as ComponentData;

  const p = (props ?? {}) as Record<string, unknown>;
  const target = data as unknown as Record<string, unknown>;

  for (const [k, v] of Object.entries(p)) {
    if (k === 'children' || k === 'key' || k === 'type') {
      continue;
    }
    if (v === undefined) {
      continue;
    }
    if (typeof v === 'function') {
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
