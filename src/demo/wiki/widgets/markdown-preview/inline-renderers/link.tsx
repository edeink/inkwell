/** @jsxImportSource @/utils/compiler */
/**
 * 链接行内渲染器。
 *
 * 主要职责：
 * - 渲染 NodeType.Link 节点的文本与点击行为。
 * - 视觉样式上使用主题主色，并设置 cursor="pointer"。
 *
 * 关键参数与内部逻辑：
 * - getLinkText：优先使用 link children[0].content 作为展示文本；
 *   若缺失则回退到 href，保证链接总有可见文本。
 * - onClick：在浏览器环境中通过 window.open 打开新标签页。
 *
 * @example
 * Markdown: [访问 Google](https://google.com)
 */
import { NodeType } from '../parser';

import { ensureKey } from './utils';

import type { InlineRenderer } from './types';

import { Text } from '@/core';

function getLinkText(text: unknown, href: unknown): string {
  if (typeof text === 'string' && text) {
    return text;
  }
  if (typeof href === 'string' && href) {
    return href;
  }
  return '';
}

export const linkInlineRenderer: InlineRenderer = {
  match: (ctx) => ctx.node.type === NodeType.Link,
  render: (ctx) => {
    const key = ensureKey(ctx.widgetKey);
    const text = getLinkText(ctx.node.children?.[0]?.content, ctx.node.href);
    const href = ctx.node.href;
    return (
      <Text
        key={key}
        text={text}
        fontSize={14}
        lineHeight={24}
        color={ctx.theme.primary}
        cursor="pointer"
        onClick={() => {
          if (href) {
            window.open(href, '_blank');
          }
        }}
      />
    );
  },
};
