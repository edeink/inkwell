/** @jsxImportSource @/utils/compiler */
/**
 * 斜体行内渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.Italic 的 content。
 * - 通过 Text 的 fontStyle="italic" 实现斜体样式。
 *
 * @example
 * Markdown: *斜体*
 */
import { NodeType } from '../parser';

import { ensureKey } from './utils';

import type { InlineRenderer } from './types';

import { Text } from '@/core';

export const italicInlineRenderer: InlineRenderer = {
  match: (ctx) => ctx.node.type === NodeType.Italic,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    return (
      <Text
        key={key}
        text={ctx.node.content || ''}
        fontSize={14}
        lineHeight={24}
        fontStyle="italic"
        color={ctx.theme.text.primary}
      />
    );
  },
};
