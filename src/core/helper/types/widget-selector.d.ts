import type { Widget } from '@/core/base';

export type Combinator = 'descendant' | 'child';

export interface FindOptions {
  multiple?: boolean;
  context?: Widget | null;
}

export function findWidget(
  root: Widget | null,
  selector: string,
  options?: FindOptions,
): Widget | Widget[] | null;
export function clearSelectorCache(root?: Widget | null): void;
