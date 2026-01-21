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
import { type InlineRenderer } from '../inline-renderers/types';
import { createRendererChain, renderWithChain } from '../renderer-registry';

import { defaultBlockRenderers } from './default-registry';
import { defaultMarkdownRenderStyle, type BlockRenderContext, type BlockRenderer } from './types';

import type { MarkdownNode } from '../parser';

import { Container } from '@/core';

export type { BlockRenderContext, BlockRenderer };

export function BlockNodeRenderer(props: {
  node: MarkdownNode;
  theme: BlockRenderContext['theme'];
  style?: BlockRenderContext['style'];
  inlineRenderers?: InlineRenderer[];
  anchorKey?: string;
  depth?: number;
  blockRenderers?: BlockRenderer[];
  key?: string | number | null;
}) {
  const {
    node,
    theme,
    style,
    inlineRenderers,
    anchorKey,
    depth,
    blockRenderers,
    key: widgetKey,
  } = props;
  const chain = createRendererChain(blockRenderers, defaultBlockRenderers);

  const renderBlock: BlockRenderContext['renderBlock'] = (params) => {
    const nestedCtx: BlockRenderContext = {
      node: params.node,
      theme,
      style: style ?? defaultMarkdownRenderStyle,
      inlineRenderers,
      anchorKey: params.anchorKey,
      depth: params.depth,
      renderBlock,
      widgetKey: params.widgetKey,
    };
    return renderWithChain(nestedCtx, chain) ?? <Container />;
  };

  const ctx: BlockRenderContext = {
    node,
    theme,
    style: style ?? defaultMarkdownRenderStyle,
    inlineRenderers,
    anchorKey,
    depth: depth ?? 0,
    renderBlock,
    widgetKey,
  };

  return renderWithChain(ctx, chain) ?? <Container />;
}
