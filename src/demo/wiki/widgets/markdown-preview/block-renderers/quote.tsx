/** @jsxImportSource @/utils/compiler */
/**
 * 引用块渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.Quote 块级节点。
 * - 左侧绘制主题色竖条，内容区域使用 InlineWrap 渲染行内节点。
 *
 * @example
 * Markdown:
 * > 这是一段引用。
 */
import { NodeType } from '../parser';

import { InlineWrap, ensureKey } from './utils';

import type { BlockRenderer } from './types';

import { Container, CrossAxisAlignment, Padding, Row } from '@/core';

export const quoteRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.Quote,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    return (
      <Padding key={key} padding={{ bottom: 14 }}>
        <Container
          color={ctx.theme.component.headerBg}
          borderRadius={6}
          border={{ width: 1, color: ctx.theme.border.secondary }}
        >
          <Row crossAxisAlignment={CrossAxisAlignment.Stretch}>
            <Container width={4} color={ctx.theme.primary} />
            <Padding padding={{ left: 12, top: 10, bottom: 10, right: 12 }}>
              <InlineWrap theme={ctx.theme} children={ctx.node.children} />
            </Padding>
          </Row>
        </Container>
      </Padding>
    );
  },
};
