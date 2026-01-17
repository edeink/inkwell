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

export const unorderedListRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.List,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    return (
      <Padding key={key} padding={{ bottom: 12 }}>
        <Column crossAxisAlignment={CrossAxisAlignment.Start} spacing={6}>
          {ctx.node.children?.map((child, i) => (
            <Row key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start} spacing={10}>
              <Padding padding={{ top: 10 }}>
                <Container width={6} height={6} color={ctx.theme.text.primary} borderRadius={3} />
              </Padding>
              <Expanded flex={{ flex: 1 }}>
                <InlineWrap
                  theme={ctx.theme}
                  children={child.children}
                  keyPrefix={`${key ?? 'ul'}-li-${i}`}
                />
              </Expanded>
            </Row>
          ))}
        </Column>
      </Padding>
    );
  },
};
