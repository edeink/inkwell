/** @jsxImportSource @/utils/compiler */
/**
 * 有序列表渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.OrderedList 块级节点。
 * - 为每个 ListItem 绘制序号（1. / 2. / ...），并使用 InlineWrap 渲染条目内容。
 *
 * @example
 * Markdown:
 * 1. 第一项
 * 2. 第二项
 */
import { NodeType } from '../parser';

import { InlineWrap, ensureKey } from './utils';

import type { BlockRenderer } from './types';

import { Column, Container, CrossAxisAlignment, Expanded, Padding, Row, Text } from '@/core';

export const orderedListRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.OrderedList,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    return (
      <Padding key={key} padding={{ bottom: ctx.style.orderedList.marginBottom }}>
        <Column
          crossAxisAlignment={CrossAxisAlignment.Start}
          spacing={ctx.style.orderedList.columnSpacing}
        >
          {ctx.node.children?.map((child, i) => (
            <Row
              key={String(i)}
              crossAxisAlignment={CrossAxisAlignment.Start}
              spacing={ctx.style.orderedList.rowSpacing}
            >
              <Container
                width={ctx.style.orderedList.numberWidth}
                padding={{ top: ctx.style.orderedList.numberPaddingTop }}
              >
                <Text
                  text={`${i + 1}.`}
                  fontSize={ctx.style.orderedList.numberFontSize}
                  lineHeight={ctx.style.orderedList.numberLineHeight}
                  color={ctx.theme.text.primary}
                />
              </Container>
              <Expanded flex={{ flex: 1 }}>
                <InlineWrap
                  theme={ctx.theme}
                  style={ctx.style}
                  inlineRenderers={ctx.inlineRenderers}
                  children={child.children}
                  keyPrefix={`${key ?? 'ol'}-li-${i}`}
                />
              </Expanded>
            </Row>
          ))}
        </Column>
      </Padding>
    );
  },
};
