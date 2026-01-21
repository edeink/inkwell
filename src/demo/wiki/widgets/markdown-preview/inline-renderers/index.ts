/**
 * 行内节点渲染入口。
 *
 * 主要职责：
 * - 构造行内渲染上下文（node/theme/key）。
 * - 合并外部传入的行内渲染器与默认渲染器。
 * - 按顺序匹配并渲染第一个命中的渲染器。
 *
 * 关键参数说明：
 * - node：单个 Markdown 行内节点（例如 Text/Bold/Italic/Link/Image）。
 * - theme：主题色板，用于统一文字/背景色。
 * - inlineRenderers：可选的外部渲染器列表，优先级高于默认渲染器，可用于覆盖样式或扩展新语法。
 * - key：传给 Widget 的 key，会透传到渲染上下文用于生成稳定 key。
 *
 * @example
 * ```ts
 * InlineNodeRenderer({ node, theme, inlineRenderers: [myRenderer] })
 * ```
 */
import { defaultMarkdownRenderStyle } from '../block-renderers/types';
import { createRendererChain, renderWithChain } from '../renderer-registry';

import { defaultInlineRenderers } from './default-registry';

import type { MarkdownNode } from '../parser';
import type { InlineRenderContext, InlineRenderer } from './types';

export type { InlineRenderContext, InlineRenderer };

export function InlineNodeRenderer(props: {
  node: MarkdownNode;
  theme: InlineRenderContext['theme'];
  style?: InlineRenderContext['style'];
  inlineRenderers?: InlineRenderer[];
  key?: string | number | null;
}) {
  const { node, theme, style, inlineRenderers, key: widgetKey } = props;
  const ctx: InlineRenderContext = {
    node,
    theme,
    style: style ?? defaultMarkdownRenderStyle,
    widgetKey,
  };
  const chain = createRendererChain(inlineRenderers, defaultInlineRenderers);
  return renderWithChain(ctx, chain);
}
