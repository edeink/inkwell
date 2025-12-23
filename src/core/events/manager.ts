/**
 * 事件管理器
 *
 * 模块功能说明：
 * - 采用事件委托：将鼠标/指针/触摸类事件统一绑定到 document，按坐标路由到命中的 canvas。
 * - 键盘事件仍绑定在各自容器以遵循聚焦语义。
 * - 支持多 canvas 独立事件系统、重叠优先级与动态增删。
 *
 * 核心 API：
 * - bind(runtime): 注册运行时并按需绑定全局委托监听。
 * - unbind(runtime): 解除该运行时并在无实例时解绑全局监听。
 *
 * 使用注意事项：
 * - 为确保可聚焦以接收键盘事件，Canvas 在绑定时会设置 tabIndex=0。
 */
import { dispatchAt } from './dispatcher';

import type { EventType } from './types';
import type Runtime from '@/runtime';

type ListenerMap = Map<
  string,
  {
    canvas: HTMLCanvasElement;
    container: HTMLElement;
    keyboardHandlers: Map<EventType, (e: Event) => void>;
    runtime: Runtime;
  }
>;

const allTypes: EventType[] = [
  'click',
  'mousedown',
  'mouseup',
  'mousemove',
  'mouseover',
  'mouseout',
  'wheel',
  'dblclick',
  'contextmenu',
  'pointerdown',
  'pointerup',
  'pointermove',
  'pointerover',
  'pointerout',
  'pointerenter',
  'pointerleave',
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
  'keydown',
  'keyup',
  'keypress',
];

function isKeyboard(type: EventType): boolean {
  return type === 'keydown' || type === 'keyup' || type === 'keypress';
}

const delegatedTypes: EventType[] = allTypes.filter((t) => !isKeyboard(t));

class EventManagerImpl {
  private map: ListenerMap = new Map();
  private globalHandlers: Map<EventType, (e: Event) => void> = new Map();
  private delegatedAttached = false;
  private latestMoveEvent: {
    type: EventType;
    native: MouseEvent | PointerEvent | TouchEvent;
  } | null = null;
  private rafId: number | null = null;

  private attachDelegated(): void {
    if (this.delegatedAttached) {
      return;
    }
    for (const type of delegatedTypes) {
      const fn = (e: Event) => {
        const native = e as MouseEvent | WheelEvent | PointerEvent | TouchEvent;
        if (type === 'mousemove' || type === 'pointermove' || type === 'touchmove') {
          this.latestMoveEvent = { type, native: native as MouseEvent | PointerEvent | TouchEvent };
          if (this.rafId == null) {
            this.rafId = window.requestAnimationFrame(() => {
              const payload = this.latestMoveEvent;
              this.latestMoveEvent = null;
              this.rafId = null;
              if (payload) {
                this.route(payload.type, payload.native);
              }
            });
          }
        } else {
          this.route(type, native);
        }
      };
      this.globalHandlers.set(type, fn);
      const passive = false;
      document.addEventListener(type, fn as EventListener, { passive });
    }
    this.delegatedAttached = true;
  }

  private detachDelegated(): void {
    if (!this.delegatedAttached) {
      return;
    }
    for (const [type, fn] of this.globalHandlers) {
      document.removeEventListener(type, fn as EventListener);
    }
    this.globalHandlers.clear();
    this.delegatedAttached = false;
    if (this.rafId != null) {
      try {
        window.cancelAnimationFrame(this.rafId);
      } catch {}
      this.rafId = null;
      this.latestMoveEvent = null;
    }
  }

  private getClientXY(
    native: MouseEvent | WheelEvent | PointerEvent | TouchEvent,
  ): { x: number; y: number } | null {
    if ('clientX' in native && typeof native.clientX === 'number') {
      return { x: native.clientX, y: (native as MouseEvent | WheelEvent).clientY as number };
    }
    if ('touches' in native && (native as TouchEvent).touches.length > 0) {
      const t = (native as TouchEvent).touches[0];
      return { x: t.clientX, y: t.clientY };
    }
    if ('changedTouches' in native && (native as TouchEvent).changedTouches.length > 0) {
      const t = (native as TouchEvent).changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    }
    return null;
  }

  private getTargetRuntime(
    native: MouseEvent | WheelEvent | PointerEvent | TouchEvent,
  ): Runtime | null {
    const pos = this.getClientXY(native);
    if (!pos) {
      return null;
    }
    const els = document.elementsFromPoint(pos.x, pos.y);
    for (const el of els) {
      if (el instanceof HTMLCanvasElement) {
        const id = (el as HTMLCanvasElement).dataset.inkwellId || '';
        if (!id) {
          continue;
        }
        const rec = this.map.get(id);
        if (rec) {
          return rec.runtime ?? null;
        }
      }
    }
    return null;
  }

  private route(
    type: EventType,
    native: MouseEvent | WheelEvent | PointerEvent | TouchEvent,
  ): void {
    const runtime = this.getTargetRuntime(native);
    if (!runtime) {
      return;
    }
    dispatchAt(runtime, type, native);
  }

  bind(runtime: Runtime): void {
    const renderer = runtime.getRenderer();
    const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? runtime.container?.querySelector('canvas') ?? null;
    const container = runtime.container ?? null;
    if (!canvas) {
      return;
    }
    const id = runtime.getCanvasId?.() ?? '';
    if (!id) {
      return;
    }
    if (this.map.has(id)) {
      return;
    }
    if (canvas.tabIndex < 0) {
      canvas.tabIndex = 0;
    }
    const keyboardHandlers = new Map<EventType, (e: Event) => void>();
    for (const type of allTypes) {
      if (!isKeyboard(type)) {
        continue;
      }
      const fn = (e: Event) => {
        dispatchAt(
          runtime,
          type,
          e as MouseEvent | WheelEvent | PointerEvent | TouchEvent | KeyboardEvent,
        );
      };
      keyboardHandlers.set(type, fn);
      if (container) {
        container.addEventListener(type, fn as EventListener);
      }
    }
    this.map.set(id, { canvas, container: container!, keyboardHandlers, runtime });
    if (this.map.size === 1) {
      this.attachDelegated();
    }
  }

  unbind(runtime: Runtime): void {
    const id = runtime.getCanvasId?.() ?? '';
    const rec = this.map.get(id);
    if (!rec) {
      return;
    }
    for (const [type, fn] of rec.keyboardHandlers) {
      if (rec.container) {
        rec.container.removeEventListener(type, fn as EventListener);
      }
    }
    this.map.delete(id);
    if (this.map.size === 0) {
      this.detachDelegated();
    }
  }
}

export const EventManager = new EventManagerImpl();
