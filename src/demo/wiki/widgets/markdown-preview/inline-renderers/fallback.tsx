/** @jsxImportSource @/utils/compiler */
/**
 * 行内渲染兜底渲染器。
 *
 * 主要职责：
 * - 当没有其它行内渲染器命中时，尽可能把节点的 content 渲染出来，
 *   避免页面出现空白或崩溃。
 *
 * 约定：
 * - match 恒为 true，因此必须放在默认渲染器列表的最后。
 */
import { ensureKey } from './utils';

import type { InlineRenderer } from './types';

import { Text } from '@/core';

export const fallbackInlineRenderer: InlineRenderer = {
  match: () => true,
  render: (ctx) => (
    <Text
      key={ensureKey(ctx.widgetKey)}
      text={ctx.node.content || ''}
      fontSize={14}
      lineHeight={24}
      color={ctx.theme.text.primary}
    />
  ),
};
