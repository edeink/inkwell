/** @jsxImportSource @/utils/compiler */
/**
 * 纯文本行内渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.Text 的 content。
 * - 统一默认字号为 14px，并提供较舒适的行高（24px）。
 *
 * 说明：
 * - 该渲染器只处理“纯文本”节点；加粗/斜体/链接等由其它渲染器负责。
 */
import { NodeType } from '../parser';

import { ensureKey } from './utils';

import type { InlineRenderer } from './types';

import { Text } from '@/core';

export const textInlineRenderer: InlineRenderer = {
  match: (ctx) => ctx.node.type === NodeType.Text,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    return (
      <Text
        key={key}
        text={ctx.node.content || ''}
        fontSize={14}
        lineHeight={24}
        color={ctx.theme.text.primary}
      />
    );
  },
};
