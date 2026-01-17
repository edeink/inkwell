/** @jsxImportSource @/utils/compiler */
/**
 * 表格渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.Table 块级节点。
 * - 处理表头（isHeader）与奇偶行背景色，绘制网格分割线。
 *
 * 重要实现说明：
 * - 当前实现把单元格内容降级为纯文本渲染（plainText），确保布局稳定、渲染开销可控。
 * - 若后续需要支持单元格内复杂行内样式，可在此将 plainText 替换为 InlineWrap。
 *
 * @example
 * Markdown:
 * | 表头 1 | 表头 2 |
 * | ------ | ------ |
 * | 单元格 1 | 单元格 2 |
 */
import { NodeType } from '../parser';

import { ensureKey, plainText } from './utils';

import type { BlockRenderer } from './types';

import { Column, Container, Expanded, Padding, Row, Text, Wrap } from '@/core';

export const tableRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.Table,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    const textFontSize = 14;
    const textLineHeight = 24;
    return (
      <Padding key={key} padding={{ bottom: 14 }}>
        <Container borderRadius={8} border={{ width: 1, color: ctx.theme.component.gridLine }}>
          <Column>
            {ctx.node.children?.map((row, i) => {
              const cells = row.children ?? [];
              const isLastRow = i === (ctx.node.children?.length ?? 0) - 1;
              const isHeaderRow = i === 0 && cells.some((c) => c.isHeader);
              const rowChildren = cells.flatMap((cell, j) => {
                const isLastCell = j === cells.length - 1;
                const cellWidget = (
                  <Expanded key={`cell-${j}`} flex={{ flex: 1 }}>
                    <Padding padding={{ left: 10, right: 10, top: 8, bottom: 8 }}>
                      <Wrap spacing={0} runSpacing={4}>
                        {cell.isHeader ? (
                          <Text
                            text={plainText(cell.children)}
                            fontSize={textFontSize}
                            lineHeight={textLineHeight}
                            fontWeight="bold"
                            color={ctx.theme.text.primary}
                          />
                        ) : (
                          cell.children?.map((c, k) => (
                            <Text
                              key={String(k)}
                              text={plainText([c])}
                              fontSize={textFontSize}
                              lineHeight={textLineHeight}
                              color={ctx.theme.text.primary}
                            />
                          ))
                        )}
                      </Wrap>
                    </Padding>
                  </Expanded>
                );
                if (isLastCell) {
                  return [cellWidget];
                }
                return [
                  cellWidget,
                  <Container key={`divider-${j}`} width={1} color={ctx.theme.component.gridLine} />,
                ];
              });
              return (
                <Container
                  key={String(i)}
                  color={
                    isHeaderRow
                      ? ctx.theme.component.headerBg
                      : i % 2 === 0
                        ? ctx.theme.background.base
                        : ctx.theme.background.surface
                  }
                >
                  <Column>
                    <Row>{rowChildren}</Row>
                    {!isLastRow ? (
                      <Container height={1} color={ctx.theme.component.gridLine} />
                    ) : null}
                  </Column>
                </Container>
              );
            })}
          </Column>
        </Container>
      </Padding>
    );
  },
};
