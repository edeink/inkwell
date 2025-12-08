import type { MindmapController } from '../index';
import type { ControllerPluginHookContext } from '../plugins';

/**
 * 事件分发模块
 * 将指针/滚轮/键盘/双击等事件按插件顺序分发，支持短路处理。
 */
export class EventsModule {
  private controller: MindmapController;

  constructor(controller: MindmapController) {
    this.controller = controller;
  }

  /**
   * 分发 pointerdown 事件
   * @returns 是否被插件消费
   */
  dispatchPointerDown(
    e: PointerEvent,
    ctx: ControllerPluginHookContext,
    world: { x: number; y: number },
  ): boolean {
    let handled = false;
    for (const p of this.controller.getPlugins()) {
      try {
        const r = p.onPointerDown?.(e, ctx, world);
        if (r === true) {
          handled = true;
        }
      } catch {}
    }
    return handled;
  }

  /**
   * 分发 pointermove 事件
   */
  dispatchPointerMove(
    e: PointerEvent,
    ctx: ControllerPluginHookContext,
    world: { x: number; y: number },
  ): boolean {
    let handled = false;
    for (const p of this.controller.getPlugins()) {
      try {
        const r = p.onPointerMove?.(e, ctx, world);
        if (r === true) {
          handled = true;
        }
      } catch {}
    }
    return handled;
  }

  /**
   * 分发 pointerup 事件
   */
  dispatchPointerUp(
    e: PointerEvent,
    ctx: ControllerPluginHookContext,
    world: { x: number; y: number },
  ): boolean {
    let handled = false;
    for (const p of this.controller.getPlugins()) {
      try {
        const r = p.onPointerUp?.(e, ctx, world);
        if (r === true) {
          handled = true;
        }
      } catch {}
    }
    return handled;
  }

  /**
   * 分发滚轮事件
   */
  dispatchWheel(e: WheelEvent, ctx: ControllerPluginHookContext): boolean {
    let handled = false;
    for (const p of this.controller.getPlugins()) {
      try {
        const r = p.onWheel?.(e, ctx);
        if (r === true) {
          handled = true;
        }
      } catch {}
    }
    return handled;
  }

  /**
   * 分发键盘事件
   */
  dispatchKeyDown(e: KeyboardEvent, ctx: ControllerPluginHookContext): boolean {
    let handled = false;
    for (const p of this.controller.getPlugins()) {
      try {
        const r = p.onKeyDown?.(e, ctx);
        if (r === true) {
          handled = true;
        }
      } catch {}
    }
    return handled;
  }

  /**
   * 分发双击事件
   */
  dispatchDblClick(
    e: MouseEvent,
    ctx: ControllerPluginHookContext,
    world: { x: number; y: number },
  ): boolean {
    let handled = false;
    for (const p of this.controller.getPlugins()) {
      try {
        const r = p.onDblClick?.(e, ctx, world);
        if (r === true) {
          handled = true;
        }
      } catch {}
    }
    return handled;
  }
}
