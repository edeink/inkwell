/** @jsxImportSource @/utils/compiler */
/**
 * 块级节点渲染入口。
 *
 * 主要职责：
 * - 构造块级渲染上下文（node/theme/anchorKey/key）。
 * - 合并外部传入的块级渲染器与默认渲染器。
 * - 按顺序匹配并渲染第一个命中的渲染器；未命中时返回空容器占位。
 *
 * 关键参数说明：
 * - node：单个 Markdown 块级节点（例如 Header/Paragraph/List/Table/CodeBlock）。
 * - theme：主题色板，用于统一前景/背景/边框色。
 * - anchorKey：用于标题锚点定位的 key（通常只对 Header 生效）。
 * - blockRenderers：可选的外部块级渲染器列表，优先级高于默认渲染器。
 *
 * @example
 * ```ts
 * <BlockNodeRenderer node={node} theme={theme} anchorKey="md-h-0" />
 * ```
 */
import { createRendererChain, renderWithChain } from '../renderer-registry';

import { defaultBlockRenderers } from './default-registry';

import type { MarkdownNode } from '../parser';
import type { BlockRenderContext, BlockRenderer } from './types';

import { Container } from '@/core';

export type { BlockRenderContext, BlockRenderer };

export function BlockNodeRenderer(props: {
  node: MarkdownNode;
  theme: BlockRenderContext['theme'];
  anchorKey?: string;
  blockRenderers?: BlockRenderer[];
  key?: string | number | null;
}) {
  const { node, theme, anchorKey, blockRenderers, key: widgetKey } = props;
  const ctx: BlockRenderContext = { node, theme, anchorKey, widgetKey };
  const chain = createRendererChain(blockRenderers, defaultBlockRenderers);
  return renderWithChain(ctx, chain) ?? <Container />;
}
