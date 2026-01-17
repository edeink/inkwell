/**
 * 默认块级渲染器注册表。
 *
 * 顺序即优先级（从上到下依次匹配），一般应保证：
 * - 语义更具体的渲染器放在更靠前的位置（例如 Header/CodeBlock）。
 * - `fallback` 永远放在最后，避免吞掉其它类型。
 *
 * 外部传入的渲染器会被插入到默认渲染器之前，用于覆盖默认渲染行为。
 */
import { codeBlockRenderer } from './code-block';
import { fallbackRenderer } from './fallback';
import { headerRenderer } from './header';
import { horizontalRuleRenderer } from './horizontal-rule';
import { unorderedListRenderer } from './list';
import { orderedListRenderer } from './ordered-list';
import { paragraphRenderer } from './paragraph';
import { quoteRenderer } from './quote';
import { tableRenderer } from './table';
import { taskListRenderer } from './task-list';

import type { BlockRenderer } from './types';

export const defaultBlockRenderers: BlockRenderer[] = [
  headerRenderer,
  paragraphRenderer,
  codeBlockRenderer,
  quoteRenderer,
  unorderedListRenderer,
  orderedListRenderer,
  taskListRenderer,
  tableRenderer,
  horizontalRuleRenderer,
  fallbackRenderer,
];
