/** @jsxImportSource @/utils/compiler */
/**
 * 行内代码渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.CodeBlock（行内模式）节点的 content。
 * - 使用等宽字体，并加上轻量背景，提升可读性。
 *
 * 说明：
 * - 该实现复用 NodeType.CodeBlock 作为行内代码节点类型。
 * - 块级代码块由 block-renderers/code-block.tsx 处理。
 *
 * @example
 * Markdown: `const a = 1`
 */
import { NodeType } from '../parser';

import { ensureKey } from './utils';

import type { InlineRenderer } from './types';

import { Container, Padding, Text } from '@/core';

export const codeInlineRenderer: InlineRenderer = {
  match: (ctx) => ctx.node.type === NodeType.CodeBlock,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    return (
      <Container key={key} color={ctx.theme.state.hover}>
        <Padding padding={{ left: 4, right: 4, top: 2, bottom: 2 }}>
          <Text
            text={ctx.node.content || ''}
            fontSize={14}
            lineHeight={20}
            fontFamily="Monaco, Consolas, monospace"
            color={ctx.theme.text.primary}
          />
        </Padding>
      </Container>
    );
  },
};
