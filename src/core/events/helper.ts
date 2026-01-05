import type { EventType } from './types';

export const toEventType = (base: string): EventType | null => {
  const lower = base.toLowerCase();
  const map: Record<string, EventType> = {
    click: 'click',
    mousedown: 'mousedown',
    mouseup: 'mouseup',
    mousemove: 'mousemove',
    mouseover: 'mouseover',
    mouseout: 'mouseout',
    wheel: 'wheel',
    dblclick: 'dblclick',
    doubleclick: 'dblclick',
    contextmenu: 'contextmenu',
    pointerdown: 'pointerdown',
    pointerup: 'pointerup',
    pointermove: 'pointermove',
    pointerover: 'pointerover',
    pointerout: 'pointerout',
    pointerenter: 'pointerenter',
    pointerleave: 'pointerleave',
    mouseenter: 'mouseenter',
    mouseleave: 'mouseleave',
    focus: 'focus',
    blur: 'blur',
    touchstart: 'touchstart',
    touchmove: 'touchmove',
    touchend: 'touchend',
    touchcancel: 'touchcancel',
    keydown: 'keydown',
    keyup: 'keyup',
    keypress: 'keypress',
  };
  return map[lower] ?? null;
};
