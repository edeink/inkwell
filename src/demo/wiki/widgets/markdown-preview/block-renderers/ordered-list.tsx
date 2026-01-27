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

function isInlineNodeType(type: NodeType) {
  return (
    type === NodeType.Text ||
    type === NodeType.Bold ||
    type === NodeType.Italic ||
    type === NodeType.Link ||
    type === NodeType.Image ||
    type === NodeType.CodeBlock
  );
}

export const orderedListRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.OrderedList,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    const depth = ctx.depth;
    const indentUnit = ctx.style.orderedList.numberWidth + ctx.style.orderedList.rowSpacing;
    return (
      <Padding
        key={key}
        padding={{
          left: indentUnit * depth,
          bottom: depth === 0 ? ctx.style.orderedList.marginBottom : 0,
        }}
      >
        <Column
          crossAxisAlignment={CrossAxisAlignment.Start}
          spacing={ctx.style.orderedList.columnSpacing}
        >
          {ctx.node.children?.map((child, i) => {
            const rawChildren = child.children ?? [];
            const inlineChildren = rawChildren.filter((n) => isInlineNodeType(n.type));
            const nestedBlocks = rawChildren.filter(
              (n) =>
                n.type === NodeType.List ||
                n.type === NodeType.OrderedList ||
                n.type === NodeType.TaskList,
            );

            return (
              <Column
                key={String(i)}
                crossAxisAlignment={CrossAxisAlignment.Start}
                spacing={ctx.style.orderedList.columnSpacing}
              >
                <Row
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
                      children={inlineChildren}
                      keyPrefix={`${key ?? 'ol'}-li-${i}`}
                    />
                  </Expanded>
                </Row>
                {nestedBlocks.map((n, j) =>
                  ctx.renderBlock({
                    node: n,
                    depth: depth + 1,
                    widgetKey: `${key ?? 'ol'}-li-${i}-b-${j}`,
                  }),
                )}
              </Column>
            );
          })}
        </Column>
      </Padding>
    );
  },
};
