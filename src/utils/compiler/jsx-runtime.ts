/**
 * 自定义 JSX 运行时：提供 jsx/jsxs/Fragment
 * 目标：在不依赖 React 的情况下生成轻量元素对象，供编译器转换为 JSON
 */

export interface JSXElement {
  type: unknown;
  props: Record<string, unknown> | null;
  key?: string | number | null;
}

export const Fragment = Symbol('Fragment');

function normalizeProps(props: unknown): Record<string, unknown> | null {
  if (!props) {
    return null;
  }
  // children 已由编译器处理，无需改动
  return props as Record<string, unknown>;
}

export function jsx(type: unknown, props: unknown, key?: string | number): JSXElement {
  return { type, props: normalizeProps(props), key: key ?? null };
}

export function jsxs(type: unknown, props: unknown, key?: string | number): JSXElement {
  return { type, props: normalizeProps(props), key: key ?? null };
}

// 开发模式下 Vite/TS 可能会请求 jsx-dev-runtime 的 jsxDEV
export function jsxDEV(type: unknown, props: unknown, key?: string | number): JSXElement {
  return { type, props: normalizeProps(props), key: key ?? null };
}

export function createElement(
  type: unknown,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): JSXElement {
  const nextProps = { ...(props || {}), children } as Record<string, unknown>;
  const k = (nextProps as Record<string, unknown>).key as string | number | undefined;
  return { type, props: nextProps, key: k ?? null };
}
