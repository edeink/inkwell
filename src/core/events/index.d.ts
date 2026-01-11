/**
 * 事件系统类型声明入口
 * - 提供给使用者的类型与 API 声明，配合路径别名 '@/core/events' 使用。
 * - 依赖 '@/core/base' 与 '@/runtime' 的路径映射，请确保 tsconfig.paths 配置正确。
 */
import type { Widget } from '@/core/base';
import type Runtime from '@/runtime';

export type EventType =
  | 'click'
  | 'mousedown'
  | 'mouseup'
  | 'mousemove'
  | 'mouseover'
  | 'mouseout'
  | 'wheel'
  | 'dblclick'
  | 'contextmenu'
  | 'pointerdown'
  | 'pointerup'
  | 'pointermove'
  | 'pointerover'
  | 'pointerout'
  | 'pointerenter'
  | 'pointerleave'
  | 'touchstart'
  | 'touchmove'
  | 'touchend'
  | 'touchcancel'
  | 'keydown'
  | 'keyup'
  | 'keypress';

export declare const enum EventPhase {
  Capture = 1,
  Target = 2,
  Bubble = 3,
}

export interface InkwellEvent {
  type: EventType;
  target: Widget;
  currentTarget: Widget;
  eventPhase: EventPhase;
  clientX?: number;
  clientY?: number;
  x: number;
  y: number;
  nativeEvent?: Event;
  // 键盘/鼠标修饰键
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  stopPropagation(): void;
  readonly propagationStopped: boolean;
}

export type EventHandler = (e: InkwellEvent) => boolean | void;

export interface HandlerEntry {
  handler: EventHandler;
  capture: boolean;
}

export declare const EventRegistry: {
  setCurrentRuntime(rt: Runtime | null): void;
  register(
    key: string,
    type: EventType,
    handler: EventHandler,
    opts?: { capture?: boolean },
    rt?: Runtime | null,
  ): void;
  getHandlers(key: string, type: EventType, rt?: Runtime | null): HandlerEntry[];
  clearKey(key: string, rt?: Runtime | null): void;
  clearAll(): void;
  clearRuntime(rt: Runtime): void;
};

export declare const EventManager: {
  bind(runtime: Runtime): void;
  unbind(runtime: Runtime): void;
};

export declare function dispatchAt(
  runtime: Runtime,
  type: EventType,
  native: MouseEvent | WheelEvent | PointerEvent | TouchEvent | KeyboardEvent,
): void;
export declare function dispatchToTree(
  root: Widget,
  target: Widget,
  type: EventType,
  x: number,
  y: number,
  native?: Event,
): void;

export declare function hitTest(root: Widget | null, x: number, y: number): Widget | null;
