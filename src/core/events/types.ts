/**
 * 事件类型与事件结构定义
 *
 * 模块功能说明：
 * - 定义 Inkwell 事件系统支持的原生事件类型映射（鼠标/指针/触摸/键盘）。
 * - 约定事件传播阶段（捕获/目标/冒泡）。
 * - 统一框架内部事件对象结构 InkwellEvent。
 *
 * 使用注意事项：
 * - 返回 false 的处理器将终止当前阶段及后续传播。
 * - 调用 e.stopPropagation() 可显式阻止后续节点在同阶段继续处理。
 */
import type { Widget } from '@/core/base';

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

export const enum EventPhase {
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
  stopPropagation(): void;
  propagationStopped: boolean;
}

export type EventHandler = (e: InkwellEvent) => boolean | void;

export interface HandlerEntry {
  handler: EventHandler;
  capture: boolean;
}
