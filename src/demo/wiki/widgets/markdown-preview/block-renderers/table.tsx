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

import { ensureKey, InlineWrap, plainText } from './utils';

import type { BlockRenderer } from './types';

import { Column, Container, Expanded, Padding, Row, Text, Wrap } from '@/core';

export const tableRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.Table,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    const textFontSize = ctx.style.table.textFontSize;
    const textLineHeight = ctx.style.table.textLineHeight;
    const cellStyle = {
      ...ctx.style,
      text: { fontSize: textFontSize, lineHeight: textLineHeight },
    };
    return (
      <Padding key={key} padding={{ bottom: ctx.style.table.marginBottom }}>
        <Container
          borderRadius={ctx.style.table.borderRadius}
          border={{ width: ctx.style.table.borderWidth, color: ctx.theme.component.gridLine }}
        >
          <Column>
            {ctx.node.children?.map((row, i) => {
              const cells = row.children ?? [];
              const isLastRow = i === (ctx.node.children?.length ?? 0) - 1;
              const isHeaderRow = i === 0 && cells.some((c) => c.isHeader);
              const rowChildren = cells.flatMap((cell, j) => {
                const isLastCell = j === cells.length - 1;
                const cellWidget = (
                  <Expanded key={`cell-${j}`} flex={{ flex: 1 }}>
                    <Padding
                      padding={{
                        left: ctx.style.table.cellPaddingLeft,
                        right: ctx.style.table.cellPaddingRight,
                        top: ctx.style.table.cellPaddingTop,
                        bottom: ctx.style.table.cellPaddingBottom,
                      }}
                    >
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
                          <InlineWrap
                            theme={ctx.theme}
                            style={cellStyle}
                            inlineRenderers={ctx.inlineRenderers}
                            children={cell.children}
                            keyPrefix={`${key ?? 'table'}-${i}-${j}`}
                          />
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
                  <Container
                    key={`divider-${j}`}
                    width={ctx.style.table.dividerWidth}
                    color={ctx.theme.component.gridLine}
                  />,
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
                      <Container
                        height={ctx.style.table.dividerWidth}
                        color={ctx.theme.component.gridLine}
                      />
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
