/** @jsxImportSource @/utils/compiler */
/**
 * 代码块渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.CodeBlock 块级节点（``` fenced code）。
 * - 使用 CodeBlockHighlighter 进行轻量的 token 上色（Demo 级别实现）。
 * - 使用主题的 headerBg/border.secondary 形成代码块容器视觉。
 *
 * 说明：
 * - 行内代码（`inline code`）由 inline-renderers/code.tsx 处理。
 *
 * @example
 * Markdown:
 * ```ts
 * const a = 1
 * ```
 */
import { NodeType } from '../parser';

import { CodeBlockHighlighter, ensureKey } from './utils';

import type { BlockRenderer } from './types';

import { Container, Padding } from '@/core';

export const codeBlockRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.CodeBlock,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    return (
      <Container
        key={key}
        color={ctx.theme.component.headerBg}
        borderRadius={ctx.style.codeBlock.borderRadius}
        border={{ width: ctx.style.codeBlock.borderWidth, color: ctx.theme.border.secondary }}
        margin={{ bottom: ctx.style.codeBlock.marginBottom }}
      >
        <Padding padding={ctx.style.codeBlock.padding}>
          <CodeBlockHighlighter
            code={ctx.node.content || ''}
            language={ctx.node.language || ''}
            theme={ctx.theme}
            style={ctx.style}
          />
        </Padding>
      </Container>
    );
  },
};
