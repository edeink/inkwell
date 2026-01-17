/**
 * 默认行内渲染器注册表。
 *
 * 顺序即优先级（从上到下依次匹配），一般应保证：
 * - 语义更具体的渲染器放在更靠前的位置；
 * - `fallback` 永远放在最后，避免吞掉其它类型。
 *
 * 注意：
 * - 默认顺序会影响渲染结果，例如 `Text` 需要最先匹配纯文本节点。
 * - 外部传入的渲染器会插入到默认渲染器之前，从而覆盖默认行为。
 */
import { boldInlineRenderer } from './bold';
import { codeInlineRenderer } from './code';
import { fallbackInlineRenderer } from './fallback';
import { imageInlineRenderer } from './image';
import { italicInlineRenderer } from './italic';
import { linkInlineRenderer } from './link';
import { textInlineRenderer } from './text';

import type { InlineRenderer } from './types';

export const defaultInlineRenderers: InlineRenderer[] = [
  textInlineRenderer,
  boldInlineRenderer,
  italicInlineRenderer,
  codeInlineRenderer,
  linkInlineRenderer,
  imageInlineRenderer,
  fallbackInlineRenderer,
];
