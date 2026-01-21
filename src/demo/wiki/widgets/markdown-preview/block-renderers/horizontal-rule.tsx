/** @jsxImportSource @/utils/compiler */
/**
 * 分割线渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.HorizontalRule 块级节点。
 * - 使用主题的 gridLine 颜色绘制 1px 横线，并提供上下间距。
 *
 * @example
 * Markdown:
 * ---
 */
import { NodeType } from '../parser';

import { ensureKey } from './utils';

import type { BlockRenderer } from './types';

import { Container, Padding } from '@/core';

export const horizontalRuleRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.HorizontalRule,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    return (
      <Padding
        key={key}
        padding={{
          top: ctx.style.horizontalRule.paddingTop,
          bottom: ctx.style.horizontalRule.paddingBottom,
        }}
      >
        <Container height={ctx.style.horizontalRule.height} color={ctx.theme.component.gridLine} />
      </Padding>
    );
  },
};
