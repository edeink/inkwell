import type { EdgeInsets } from "@/core/base";
import type { Border, BorderRadius } from "@/core/container";
import type { CrossAxisAlignment, FlexFit, FlexProperties, MainAxisAlignment, MainAxisSize } from "@/core/flex/type";
import type { AlignmentGeometry } from "@/core/stack";
import type { TextStyle } from "@/core/text";
import type { ComponentData } from "@/editors/graphics-editor";
import { ComponentType } from "@/editors/graphics-editor";
import type { JSXElement } from "./jsx-runtime";

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
  if (name.endsWith("Element")) return name.slice(0, -"Element".length);
  return name;
}

function isValidType(t: string): t is ComponentType {
  return (
    t === ComponentType.Column ||
    t === ComponentType.Text ||
    t === ComponentType.Row ||
    t === ComponentType.Expanded ||
    t === ComponentType.Image ||
    t === ComponentType.SizedBox ||
    t === ComponentType.Container ||
    t === ComponentType.Padding ||
    t === ComponentType.Center ||
    t === ComponentType.Stack ||
    t === ComponentType.Positioned
  );
}

function toArrayChildren(children: unknown): AnyElement[] {
  if (!children) return [];
  if (Array.isArray(children)) {
    return children.filter((c) => c && typeof c === "object");
  }
  return [children].filter((c): c is AnyElement => c && typeof c === "object");
}

export function compileElement(element: AnyElement): ComponentData {
  const anyEl = element as { type: unknown; props: Record<string, unknown> | null; key?: string | number | null };
  const { type, props, key } = anyEl;
  const typeName = resolveTypeName(type);
  const componentType: ComponentType = isValidType(typeName)
    ? (typeName as ComponentType)
    : ComponentType.Text;

  const data: ComponentData = {
    type: componentType,
    key: key ?? `${componentType}-${Math.random().toString(36).slice(2, 11)}`,
  } as ComponentData;

  const p = (props ?? {}) as Record<string, unknown>;

  switch (componentType) {
    case ComponentType.Column:
      if (p.mainAxisAlignment) data.mainAxisAlignment = p.mainAxisAlignment as MainAxisAlignment;
      if (p.crossAxisAlignment) data.crossAxisAlignment = p.crossAxisAlignment as CrossAxisAlignment;
      if (p.spacing !== undefined) data.spacing = p.spacing as number;
      if (p.mainAxisSize) data.mainAxisSize = p.mainAxisSize as MainAxisSize;
      break;
    case ComponentType.Row:
      if (p.mainAxisAlignment) data.mainAxisAlignment = p.mainAxisAlignment as MainAxisAlignment;
      if (p.crossAxisAlignment) data.crossAxisAlignment = p.crossAxisAlignment as CrossAxisAlignment;
      if (p.spacing !== undefined) data.spacing = p.spacing as number;
      break;
    case ComponentType.Expanded:
      if (p.flex !== undefined) data.flex = p.flex as FlexProperties;
      if (p.fit) data.fit = p.fit as FlexFit;
      break;
    case ComponentType.Text:
      data.text = p.text as string;
      if (p.style) data.style = p.style as TextStyle;
      break;
    case ComponentType.Image:
      data.src = p.src as string;
      if (p.width !== undefined) data.width = p.width as number;
      if (p.height !== undefined) data.height = p.height as number;
      if (p.fit) data.fit = p.fit as FlexFit;
      if (p.alignment) data.alignment = p.alignment as AlignmentGeometry;
      break;
    case ComponentType.SizedBox:
      if (p.width !== undefined) data.width = p.width as number;
      if (p.height !== undefined) data.height = p.height as number;
      break;
    case ComponentType.Container:
      if (p.width !== undefined) data.width = p.width as number;
      if (p.height !== undefined) data.height = p.height as number;
      if (p.padding !== undefined) data.padding = p.padding as EdgeInsets | number;
      if (p.margin !== undefined) data.margin = p.margin as EdgeInsets | number;
      if (p.color) data.color = p.color as string;
      if (p.backgroundColor) data.color = p.backgroundColor as string;
      if (p.borderRadius !== undefined) data.borderRadius = p.borderRadius as BorderRadius | number;
      if (p.border) data.border = p.border as Border;
      break;
    case ComponentType.Padding:
      if (p.padding !== undefined) data.padding = p.padding as EdgeInsets | number;
      break;
    case ComponentType.Center:
      break;
    case ComponentType.Stack:
      if (p.fit) data.fit = p.fit as FlexFit;
      if (p.alignment) data.alignment = p.alignment as AlignmentGeometry;
      break;
    case ComponentType.Positioned:
      if (p.left !== undefined) data.left = p.left as number;
      if (p.top !== undefined) data.top = p.top as number;
      if (p.right !== undefined) data.right = p.right as number;
      if (p.bottom !== undefined) data.bottom = p.bottom as number;
      if (p.width !== undefined) data.width = p.width as number;
      if (p.height !== undefined) data.height = p.height as number;
      break;
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