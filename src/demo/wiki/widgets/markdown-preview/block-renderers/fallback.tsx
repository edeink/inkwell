/** @jsxImportSource @/utils/compiler */
/**
 * 块级渲染兜底渲染器。
 *
 * 主要职责：
 * - 当没有其它块级渲染器命中时，返回空容器占位，避免渲染链返回 undefined 导致上层崩溃。
 *
 * 约定：
 * - match 恒为 true，因此必须放在默认渲染器列表的最后。
 */
import { ensureKey } from './utils';

import type { BlockRenderer } from './types';

import { Container } from '@/core';

export const fallbackRenderer: BlockRenderer = {
  match: () => true,
  render: (ctx) => <Container key={ensureKey(ctx.widgetKey)} />,
};
