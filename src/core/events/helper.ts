import { EVENT_TYPE_FROM_BASE } from './constants';

import type { EventType } from './types';

export const toEventType = (base: string): EventType | null => {
  const lower = base.toLowerCase();
  return EVENT_TYPE_FROM_BASE[lower] || null;
};

export function isEditableElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Element)) {
    return false;
  }
  const tagName = el.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || (el as HTMLElement).isContentEditable;
}
