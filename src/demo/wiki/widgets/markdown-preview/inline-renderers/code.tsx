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
        <Padding
          padding={{
            left: ctx.style.inlineCode.paddingLeft,
            right: ctx.style.inlineCode.paddingRight,
            top: ctx.style.inlineCode.paddingTop,
            bottom: ctx.style.inlineCode.paddingBottom,
          }}
        >
          <Text
            text={ctx.node.content || ''}
            fontSize={ctx.style.inlineCode.fontSize}
            lineHeight={ctx.style.inlineCode.lineHeight}
            fontFamily={ctx.style.inlineCode.fontFamily}
            color={ctx.theme.text.primary}
          />
        </Padding>
      </Container>
    );
  },
};
