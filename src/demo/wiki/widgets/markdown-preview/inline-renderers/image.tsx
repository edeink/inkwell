/** @jsxImportSource @/utils/compiler */
/**
 * 图片行内渲染器（占位实现）。
 *
 * 主要职责：
 * - 渲染 NodeType.Image 节点。
 * - 当前 Demo 仅展示一个占位容器与 alt 文本，便于验证解析与布局。
 *
 * 注意：
 * - 真实图片加载（网络/缓存/解码）不在本 Demo 的目标范围内。
 * - 若后续需要支持真实图片，可在此替换为 Image 组件或自定义渲染逻辑。
 *
 * @example
 * Markdown: ![Inkwell Logo](https://via.placeholder.com/150)
 */
import { NodeType } from '../parser';

import { ensureKey } from './utils';

import type { InlineRenderer } from './types';

import { Container, Padding, Text } from '@/core';

export const imageInlineRenderer: InlineRenderer = {
  match: (ctx) => ctx.node.type === NodeType.Image,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    const alt = ctx.node.alt || '';
    return (
      <Container
        key={key}
        width={ctx.style.image.width}
        height={ctx.style.image.height}
        color={ctx.theme.background.surface}
        borderRadius={ctx.style.image.borderRadius}
      >
        <Padding padding={ctx.style.image.padding}>
          <Text
            text={`[Image: ${alt}]`}
            fontSize={ctx.style.image.textFontSize}
            color={ctx.theme.text.secondary}
          />
        </Padding>
      </Container>
    );
  },
};
