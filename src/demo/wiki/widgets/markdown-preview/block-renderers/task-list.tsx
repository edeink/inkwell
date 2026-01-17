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

export const taskListRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.TaskList,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    return (
      <Padding key={key} padding={{ bottom: 12 }}>
        <Column crossAxisAlignment={CrossAxisAlignment.Start} spacing={6}>
          {ctx.node.children?.map((child, i) => (
            <Row key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start} spacing={10}>
              <Padding padding={{ top: 6 }}>
                <Container
                  width={14}
                  height={14}
                  border={{ width: 1, color: ctx.theme.border.base }}
                  borderRadius={2}
                  color={child.checked ? ctx.theme.primary : ctx.theme.background.base}
                />
              </Padding>
              <Expanded flex={{ flex: 1 }}>
                <InlineWrap theme={ctx.theme} children={child.children} />
              </Expanded>
            </Row>
          ))}
        </Column>
      </Padding>
    );
  },
};
