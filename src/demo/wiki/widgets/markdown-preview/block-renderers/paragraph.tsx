/** @jsxImportSource @/utils/compiler */
/**
 * 段落块渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.Paragraph 块级节点。
 * - 通过 InlineWrap 将段落内的行内节点（Text/Bold/Italic/Link/...）交给行内渲染链处理。
 *
 * @example
 * Markdown: 这是一段包含 **加粗** 与 *斜体* 的文字。
 */
import { NodeType } from '../parser';

import { InlineWrap, ensureKey } from './utils';

import type { BlockRenderer } from './types';

import { Padding } from '@/core';

export const paragraphRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.Paragraph,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    return (
      <Padding key={key} padding={{ bottom: ctx.style.paragraph.marginBottom }}>
        <InlineWrap
          theme={ctx.theme}
          style={ctx.style}
          inlineRenderers={ctx.inlineRenderers}
          children={ctx.node.children}
          keyPrefix={`${key ?? 'p'}`}
        />
      </Padding>
    );
  },
};
