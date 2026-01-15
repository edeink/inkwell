import { type IRenderer } from '../renderer/IRenderer';

import type { Widget } from './base';

// --- 来自 src/core/type.ts (ComponentType) ---
export const enum ComponentType {
  Column = 'Column',
  Text = 'Text',
  NextText = 'NextText',
  Row = 'Row',
  Expanded = 'Expanded',
  Image = 'Image',
  SizedBox = 'SizedBox',
  Container = 'Container',
  Padding = 'Padding',
  Center = 'Center',
  Stack = 'Stack',
  Positioned = 'Positioned',
  Wrap = 'Wrap',
}

// --- 来自 src/core/flex/type.ts ---
export const enum MainAxisAlignment {
  Start = 'start',
  Center = 'center',
  End = 'end',
  SpaceBetween = 'spaceBetween',
  SpaceAround = 'spaceAround',
  SpaceEvenly = 'spaceEvenly',
}

export const enum CrossAxisAlignment {
  Start = 'start',
  Center = 'center',
  End = 'end',
  Stretch = 'stretch',
}

/**
 * 主轴尺寸类型
 */
export const enum MainAxisSize {
  Min = 'min',
  Max = 'max',
}

/**
 * Flex适应方式
 */
export const enum FlexFit {
  Tight = 'tight', // 类似Expanded，强制占满可用空间
  Loose = 'loose', // 类似Flexible，可以小于可用空间
}

/**
 * Flex扩展属性，类似Flutter的Flexible和Expanded
 */
export interface FlexProperties {
  flex?: number; // flex权重，类似Flutter的flex参数
  fit?: FlexFit; // 适应方式
}

// --- 来自 src/core/events/types.ts ---
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
  | 'mouseenter'
  | 'mouseleave'
  | 'focus'
  | 'blur'
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
  // 键盘/鼠标修饰键
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  stopPropagation(): void;
  propagationStopped: boolean;
}

export type EventHandler = (e: InkwellEvent) => boolean | void;

export interface HandlerEntry {
  handler: EventHandler;
  capture: boolean;
}

export interface WidgetEventHandler {
  onClick?: EventHandler;
  onClickCapture?: EventHandler;
  onDblClick?: EventHandler;
  onDblClickCapture?: EventHandler;
  onDoubleClick?: EventHandler;
  onDoubleClickCapture?: EventHandler;
  onContextMenu?: EventHandler;
  onContextMenuCapture?: EventHandler;
  onMouseDown?: EventHandler;
  onMouseDownCapture?: EventHandler;
  onMouseUp?: EventHandler;
  onMouseUpCapture?: EventHandler;
  onMouseMove?: EventHandler;
  onMouseMoveCapture?: EventHandler;
  onMouseOver?: EventHandler;
  onMouseOverCapture?: EventHandler;
  onMouseOut?: EventHandler;
  onMouseOutCapture?: EventHandler;
  onWheel?: EventHandler;
  onWheelCapture?: EventHandler;
  onTouchStart?: EventHandler;
  onTouchStartCapture?: EventHandler;
  onTouchMove?: EventHandler;
  onTouchMoveCapture?: EventHandler;
  onTouchEnd?: EventHandler;
  onTouchEndCapture?: EventHandler;
  onTouchCancel?: EventHandler;
  onTouchCancelCapture?: EventHandler;
  onPointerDown?: EventHandler;
  onPointerDownCapture?: EventHandler;
  onPointerUp?: EventHandler;
  onPointerUpCapture?: EventHandler;
  onPointerMove?: EventHandler;
  onPointerMoveCapture?: EventHandler;
  onPointerOver?: EventHandler;
  onPointerOverCapture?: EventHandler;
  onPointerOut?: EventHandler;
  onPointerOutCapture?: EventHandler;
  onPointerEnter?: EventHandler;
  onPointerEnterCapture?: EventHandler;
  onPointerLeave?: EventHandler;
  onPointerLeaveCapture?: EventHandler;
  onKeyDown?: EventHandler;
  onKeyDownCapture?: EventHandler;
  onKeyUp?: EventHandler;
  onKeyUpCapture?: EventHandler;
  onKeyPress?: EventHandler;
  onKeyPressCapture?: EventHandler;
}

// --- From src/core/base.ts ---
export type CursorType =
  | 'default'
  | 'pointer'
  | 'text'
  | 'move'
  | 'wait'
  | 'help'
  | 'not-allowed'
  | 'context-menu'
  | 'progress'
  | 'cell'
  | 'crosshair'
  | 'vertical-text'
  | 'alias'
  | 'copy'
  | 'no-drop'
  | 'grab'
  | 'grabbing'
  | 'all-scroll'
  | 'col-resize'
  | 'row-resize'
  | 'n-resize'
  | 'e-resize'
  | 's-resize'
  | 'w-resize'
  | 'ne-resize'
  | 'nw-resize'
  | 'se-resize'
  | 'sw-resize'
  | 'ew-resize'
  | 'ns-resize'
  | 'nesw-resize'
  | 'nwse-resize'
  | 'zoom-in'
  | 'zoom-out'
  | 'none';

export type PointerEvents =
  | 'auto'
  | 'none'
  | 'visiblePainted'
  | 'visibleFill'
  | 'visibleStroke'
  | 'visible'
  | 'painted'
  | 'fill'
  | 'stroke'
  | 'all'
  | 'inherit';

export interface Ref<T = unknown> {
  current: T | null;
}

// JSX 编译得到的属性
export interface WidgetProps extends WidgetEventHandler {
  key?: string;
  ref?: Ref<unknown> | ((instance: unknown) => void);
  type?: string; // TODO 此方法需要移除？
  flex?: FlexProperties;
  zIndex?: number;
  opacity?: number;
  /**
   * 指针事件控制
   * 类似于 CSS pointer-events
   */
  pointerEvent?: PointerEvents;
  cursor?: CursorType;
  // JSX 编译传入的 data 是 WidgetProps，调用了 BuildChildren 后生成 widget[]
  children?: WidgetProps[];
  // 其它未知的属性
  [key: string]: unknown;
}

export interface Constraints {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  [key: string]: number | undefined;
}

export interface Size {
  width: number;
  height: number;
}

export interface Offset {
  dx: number;
  dy: number;
}

export interface BoxConstraints extends Constraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

export interface EdgeInsets {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

export type PaddingArray =
  | [number]
  | [number, number]
  | [number, number, number]
  | [number, number, number, number];

/**
 * Padding 属性值的联合类型
 */
export type PaddingValue = EdgeInsets | number | PaddingArray;

export interface BorderRadius {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
}

export interface Border {
  width: number;
  color: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface RenderObject {
  offset: Offset;
  size: Size;
  constraints?: BoxConstraints;
  [key: string]: unknown;
}

export interface BuildContext {
  renderer: IRenderer; // 渲染器实例
  worldMatrix?: [number, number, number, number, number, number];
  dirtyRect?: { x: number; y: number; width: number; height: number };
  enableOffscreenRendering?: boolean;
  opacity?: number;
  [key: string]: unknown;
}

// 构造器类型：约束 Widget 的数据类型与返回实例类型保持一致
export type WidgetConstructor<T extends WidgetProps = WidgetProps> = new (data: T) => Widget<T>;
