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
      <Padding key={key} padding={{ bottom: ctx.style.quote.marginBottom }}>
        <Container
          color={ctx.theme.component.headerBg}
          borderRadius={ctx.style.quote.borderRadius}
          border={{ width: ctx.style.quote.borderWidth, color: ctx.theme.border.secondary }}
        >
          <Row crossAxisAlignment={CrossAxisAlignment.Stretch}>
            <Container width={ctx.style.quote.barWidth} color={ctx.theme.primary} />
            <Padding
              padding={{
                left: ctx.style.quote.paddingLeft,
                top: ctx.style.quote.paddingTop,
                bottom: ctx.style.quote.paddingBottom,
                right: ctx.style.quote.paddingRight,
              }}
            >
              <InlineWrap
                theme={ctx.theme}
                style={ctx.style}
                inlineRenderers={ctx.inlineRenderers}
                children={ctx.node.children}
              />
            </Padding>
          </Row>
        </Container>
      </Padding>
    );
  },
};
