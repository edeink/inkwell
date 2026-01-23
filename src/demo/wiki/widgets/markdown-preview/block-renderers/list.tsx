/** @jsxImportSource @/utils/compiler */
/**
 * 无序列表渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.List 块级节点。
 * - 为每个 ListItem 绘制圆点，并使用 InlineWrap 渲染条目内容。
 *
 * @example
 * Markdown:
 * - 条目 1
 * - 条目 2
 */
import { NodeType } from '../parser';

import { InlineWrap, ensureKey } from './utils';

import type { BlockRenderer } from './types';

import { Column, Container, CrossAxisAlignment, Expanded, Padding, Row } from '@/core';

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

export const unorderedListRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.List,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    const depth = ctx.depth;
    const indentUnit = ctx.style.list.markerSize + ctx.style.list.rowSpacing;
    return (
      <Padding
        key={key}
        padding={{
          left: indentUnit * depth,
          bottom: depth === 0 ? ctx.style.list.marginBottom : 0,
        }}
      >
        <Column
          crossAxisAlignment={CrossAxisAlignment.Start}
          spacing={ctx.style.list.columnSpacing}
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
              <Column key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start} spacing={0}>
                <Row
                  crossAxisAlignment={CrossAxisAlignment.Start}
                  spacing={ctx.style.list.rowSpacing}
                >
                  <Padding padding={{ top: ctx.style.list.markerPaddingTop }}>
                    <Container
                      width={ctx.style.list.markerSize}
                      height={ctx.style.list.markerSize}
                      color={ctx.theme.text.primary}
                      borderRadius={ctx.style.list.markerRadius}
                    />
                  </Padding>
                  <Expanded flex={{ flex: 1 }}>
                    <InlineWrap
                      theme={ctx.theme}
                      style={ctx.style}
                      inlineRenderers={ctx.inlineRenderers}
                      children={inlineChildren}
                      keyPrefix={`${key ?? 'ul'}-li-${i}`}
                    />
                  </Expanded>
                </Row>
                {nestedBlocks.map((n, j) =>
                  ctx.renderBlock({
                    node: n,
                    depth: depth + 1,
                    widgetKey: `${key ?? 'ul'}-li-${i}-b-${j}`,
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
