/** @jsxImportSource @/utils/compiler */
/**
 * 加粗行内渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.Bold 的 content。
 * - 通过 Text 的 fontWeight 实现加粗样式。
 *
 * @example
 * Markdown: **加粗**
 */
import { NodeType } from '../parser';

import { ensureKey } from './utils';

import type { InlineRenderer } from './types';

import { Text } from '@/core';

export const boldInlineRenderer: InlineRenderer = {
  match: (ctx) => ctx.node.type === NodeType.Bold,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    return (
      <Text
        key={key}
        text={ctx.node.content || ''}
        fontSize={14}
        lineHeight={24}
        fontWeight="bold"
        color={ctx.theme.text.primary}
      />
    );
  },
};
