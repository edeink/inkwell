/**
 * 块级渲染器类型定义。
 *
 * BlockRenderContext 额外包含 `anchorKey`，用于标题渲染时产生可定位的锚点，
 * 从而支持目录跳转/高亮等能力。
 */
import { type MarkdownNode } from '../parser';

import { type ThemePalette } from '@/styles/theme';

export type BlockRenderContext = {
  node: MarkdownNode;
  theme: ThemePalette;
  anchorKey?: string;
  widgetKey?: string | number | null;
};

export type BlockRenderer = {
  match: (ctx: BlockRenderContext) => boolean;
  render: (ctx: BlockRenderContext) => unknown;
};
