import type { EventType } from './types';

export const EVENT_PROP_EVENTS = '__events' as const;
export const EVENT_PROP_NO_EVENTS = '__noEvents' as const;

export const EVENT_HANDLER_PROP_PREFIX = 'on' as const;
export const CAPTURE_SUFFIX = 'Capture' as const;
export const CAPTURE_KEY_SUFFIX = '_capture' as const;

export const DISPATCH_PHASE_CAPTURE = 'capture' as const;
export const DISPATCH_PHASE_BUBBLE = 'bubble' as const;
export type DispatchPhase = typeof DISPATCH_PHASE_CAPTURE | typeof DISPATCH_PHASE_BUBBLE;

export const TYPEOF_FUNCTION = 'function' as const;

export const EventTypes = {
  Click: 'click',
  MouseDown: 'mousedown',
  MouseUp: 'mouseup',
  MouseMove: 'mousemove',
  MouseOver: 'mouseover',
  MouseOut: 'mouseout',
  Wheel: 'wheel',
  DblClick: 'dblclick',
  ContextMenu: 'contextmenu',
  PointerDown: 'pointerdown',
  PointerUp: 'pointerup',
  PointerMove: 'pointermove',
  PointerOver: 'pointerover',
  PointerOut: 'pointerout',
  PointerEnter: 'pointerenter',
  PointerLeave: 'pointerleave',
  MouseEnter: 'mouseenter',
  MouseLeave: 'mouseleave',
  Focus: 'focus',
  Blur: 'blur',
  TouchStart: 'touchstart',
  TouchMove: 'touchmove',
  TouchEnd: 'touchend',
  TouchCancel: 'touchcancel',
  KeyDown: 'keydown',
  KeyUp: 'keyup',
  KeyPress: 'keypress',
} as const satisfies Record<string, EventType>;

export const EVENT_TYPE_FROM_BASE: Readonly<Record<string, EventType>> = {
  click: EventTypes.Click,
  mousedown: EventTypes.MouseDown,
  mouseup: EventTypes.MouseUp,
  mousemove: EventTypes.MouseMove,
  mouseover: EventTypes.MouseOver,
  mouseout: EventTypes.MouseOut,
  wheel: EventTypes.Wheel,
  dblclick: EventTypes.DblClick,
  doubleclick: EventTypes.DblClick,
  contextmenu: EventTypes.ContextMenu,
  pointerdown: EventTypes.PointerDown,
  pointerup: EventTypes.PointerUp,
  pointermove: EventTypes.PointerMove,
  pointerover: EventTypes.PointerOver,
  pointerout: EventTypes.PointerOut,
  pointerenter: EventTypes.PointerEnter,
  pointerleave: EventTypes.PointerLeave,
  mouseenter: EventTypes.MouseEnter,
  mouseleave: EventTypes.MouseLeave,
  focus: EventTypes.Focus,
  blur: EventTypes.Blur,
  touchstart: EventTypes.TouchStart,
  touchmove: EventTypes.TouchMove,
  touchend: EventTypes.TouchEnd,
  touchcancel: EventTypes.TouchCancel,
  keydown: EventTypes.KeyDown,
  keyup: EventTypes.KeyUp,
  keypress: EventTypes.KeyPress,
};

export const ALL_EVENT_TYPES: readonly EventType[] = [
  EventTypes.Click,
  EventTypes.MouseDown,
  EventTypes.MouseUp,
  EventTypes.MouseMove,
  EventTypes.MouseOver,
  EventTypes.MouseOut,
  EventTypes.Wheel,
  EventTypes.DblClick,
  EventTypes.ContextMenu,
  EventTypes.PointerDown,
  EventTypes.PointerUp,
  EventTypes.PointerMove,
  EventTypes.PointerOver,
  EventTypes.PointerOut,
  EventTypes.PointerEnter,
  EventTypes.PointerLeave,
  EventTypes.MouseEnter,
  EventTypes.MouseLeave,
  EventTypes.Focus,
  EventTypes.Blur,
  EventTypes.TouchStart,
  EventTypes.TouchMove,
  EventTypes.TouchEnd,
  EventTypes.TouchCancel,
  EventTypes.KeyDown,
  EventTypes.KeyUp,
  EventTypes.KeyPress,
];

export function isKeyboardEventType(type: EventType): boolean {
  return type === EventTypes.KeyDown || type === EventTypes.KeyUp || type === EventTypes.KeyPress;
}

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === TYPEOF_FUNCTION;
}
