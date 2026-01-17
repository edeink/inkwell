/**
 * 行内渲染器类型定义。
 *
 * 该模块用于描述“行内节点如何被渲染”的最小契约：
 * - InlineRenderContext：渲染时需要的上下文（节点、主题、key）。
 * - InlineRenderer：一个可匹配并产出渲染结果的对象。
 *
 * 内部约定：
 * - `match` 只做类型/形态判断，不做重计算。
 * - `render` 只渲染当前节点，不处理兄弟节点与布局（由上层容器负责）。
 */
import { type MarkdownNode } from '../parser';

import { type ThemePalette } from '@/styles/theme';

export type InlineRenderContext = {
  node: MarkdownNode;
  theme: ThemePalette;
  widgetKey?: string | number | null;
};

export type InlineRenderer = {
  match: (ctx: InlineRenderContext) => boolean;
  render: (ctx: InlineRenderContext) => unknown;
};
