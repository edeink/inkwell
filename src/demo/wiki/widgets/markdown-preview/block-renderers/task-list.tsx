/** @jsxImportSource @/utils/compiler */
/**
 * 任务列表渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.TaskList 块级节点。
 * - 为每个 TaskListItem 绘制一个复选框样式（已完成用主题色填充）。
 * - 使用 InlineWrap 渲染条目内容。
 *
 * @example
 * Markdown:
 * - [x] 已完成
 * - [ ] 未完成
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

export const taskListRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.TaskList,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    const depth = ctx.depth;
    const indentUnit = ctx.style.taskList.checkboxSize + ctx.style.taskList.rowSpacing;
    return (
      <Padding
        key={key}
        padding={{ left: indentUnit * depth, bottom: ctx.style.taskList.marginBottom }}
      >
        <Column
          crossAxisAlignment={CrossAxisAlignment.Start}
          spacing={ctx.style.taskList.columnSpacing}
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
                spacing={ctx.style.taskList.columnSpacing}
              >
                <Row
                  crossAxisAlignment={CrossAxisAlignment.Start}
                  spacing={ctx.style.taskList.rowSpacing}
                >
                  <Padding padding={{ top: ctx.style.taskList.checkboxPaddingTop }}>
                    <Container
                      width={ctx.style.taskList.checkboxSize}
                      height={ctx.style.taskList.checkboxSize}
                      border={{
                        width: ctx.style.taskList.checkboxBorderWidth,
                        color: ctx.theme.border.base,
                      }}
                      borderRadius={ctx.style.taskList.checkboxBorderRadius}
                      color={child.checked ? ctx.theme.primary : ctx.theme.background.base}
                    />
                  </Padding>
                  <Expanded flex={{ flex: 1 }}>
                    <InlineWrap
                      theme={ctx.theme}
                      style={ctx.style}
                      inlineRenderers={ctx.inlineRenderers}
                      children={inlineChildren}
                      keyPrefix={`${key ?? 'task'}-li-${i}`}
                    />
                  </Expanded>
                </Row>
                {nestedBlocks.map((n, j) =>
                  ctx.renderBlock({
                    node: n,
                    depth: depth + 1,
                    widgetKey: `${key ?? 'task'}-li-${i}-b-${j}`,
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
