/** @jsxImportSource @/utils/compiler */
/**
 * 标题块渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.Header 块级节点。
 * - 根据 level 自动计算字号与行高，保持层级视觉差异。
 * - 通过 anchorKey 或 widgetKey 生成稳定 key，便于目录锚点定位与重建稳定性。
 *
 * 关键参数说明（来自 BlockRenderContext）：
 * - node.level：标题级别（1-6），缺省视为 1。
 * - anchorKey：上层为标题生成的锚点 key，优先用于当前块 key。
 *
 * @example
 * Markdown: ## 二级标题
 */
import { NodeType } from '../parser';

import { ensureKey, plainText } from './utils';

import type { BlockRenderer } from './types';

import { Container, Padding, Row, Text } from '@/core';
import { CrossAxisAlignment } from '@/core/flex/type';

export const headerRenderer: BlockRenderer = {
  match: (ctx) => ctx.node.type === NodeType.Header,
  render: (ctx) => {
    const key = ensureKey(ctx.anchorKey ?? ctx.widgetKey);
    const level = ctx.node.level || 1;
    const text = plainText(ctx.node.children);
    const idx = Math.min(Math.max(level, 1), 6) - 1;
    const fontSize = ctx.style.header.fontSize[idx] ?? ctx.style.text.fontSize;
    const lineHeight = ctx.style.header.lineHeight[idx] ?? ctx.style.text.lineHeight;
    const accent = ctx.style.header.accentBar;
    const showAccent = !!accent && accent.levels.includes(level);
    const accentColor = accent?.color ?? ctx.theme.primary;
    const accentHeight = accent?.height ?? Math.max(0, lineHeight - 6);
    return (
      <Padding
        key={key}
        padding={{ top: ctx.style.header.paddingTop, bottom: ctx.style.header.paddingBottom }}
      >
        {showAccent ? (
          <Row crossAxisAlignment={CrossAxisAlignment.Start} spacing={accent.gap}>
            <Container
              width={accent.width}
              height={accentHeight}
              color={accentColor}
              borderRadius={accent.radius}
            />
            <Text
              text={text}
              fontSize={fontSize}
              lineHeight={lineHeight}
              fontWeight="bold"
              color={ctx.theme.text.primary}
            />
          </Row>
        ) : (
          <Text
            text={text}
            fontSize={fontSize}
            lineHeight={lineHeight}
            fontWeight="bold"
            color={ctx.theme.text.primary}
          />
        )}
      </Padding>
    );
  },
};
