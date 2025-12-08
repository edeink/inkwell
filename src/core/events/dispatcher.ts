/**
 * 事件分发器
 *
 * 模块功能说明：
 * - 根据命中目标构建节点路径，并按捕获→目标→冒泡顺序分发事件。
 * - 统一处理鼠标/指针/触摸/键盘事件在画布坐标系中的转换。
 *
 * 核心 API：
 * - dispatchAt(runtime, type, native): 从原生事件计算坐标并分发到树。
 * - dispatchToTree(root, target, type, x, y, native?): 按传播规则分发到指定树。
 *
 * 使用注意事项：
 * - 处理器返回 false 或调用 e.stopPropagation() 均会终止后续传播。
 * - 键盘事件以根节点为目标进行分发。
 */
import { hitTest } from './hit-test';
import { EventRegistry } from './registry';
import { EventPhase, type EventType, type InkwellEvent } from './types';

import type { Widget } from '@/core/base';
import type Runtime from '@/runtime';

let currentRuntime: Runtime | null = null;

function buildPath(target: Widget | null): Widget[] {
  const path: Widget[] = [];
  let cur = target;
  while (cur) {
    path.push(cur);
    cur = cur.parent;
  }
  return path.reverse();
}

function createEvent(
  type: EventType,
  target: Widget,
  current: Widget,
  phase: EventPhase,
  x: number,
  y: number,
  native?: Event,
): InkwellEvent {
  let stopped = false;
  return {
    type,
    target,
    currentTarget: current,
    eventPhase: phase,
    clientX: (native as MouseEvent | WheelEvent | undefined)?.clientX,
    clientY: (native as MouseEvent | WheelEvent | undefined)?.clientY,
    x,
    y,
    nativeEvent: native,
    stopPropagation() {
      stopped = true;
    },
    get propagationStopped() {
      return stopped;
    },
  } as InkwellEvent;
}

function invokeHandlers(
  key: string,
  type: EventType,
  event: InkwellEvent,
  phase: 'capture' | 'bubble',
): boolean {
  const list = EventRegistry.getHandlers(key, type, currentRuntime);
  const ordered =
    phase === 'capture' ? list.filter((h) => h.capture) : list.filter((h) => !h.capture);
  for (const it of ordered) {
    const ret = it.handler(event);
    if (event.propagationStopped === true) {
      return false;
    }
    if (ret === false) {
      return false;
    }
  }
  return true;
}

export function dispatchAt(
  runtime: Runtime,
  type: EventType,
  native: MouseEvent | WheelEvent | PointerEvent | TouchEvent | KeyboardEvent,
): void {
  currentRuntime = runtime;
  const renderer = runtime.getRenderer();
  const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
  const canvas = raw?.canvas ?? runtime.getContainer()?.querySelector('canvas') ?? null;
  if (!canvas) {
    currentRuntime = null;
    return;
  }
  const rect = (canvas as HTMLCanvasElement).getBoundingClientRect();
  let clientX: number | undefined;
  let clientY: number | undefined;
  if ('clientX' in native && typeof native.clientX === 'number') {
    clientX = native.clientX;
    clientY = native.clientY as number | undefined;
  } else if ('touches' in native && (native as TouchEvent).touches.length > 0) {
    const t = (native as TouchEvent).touches[0];
    clientX = t.clientX;
    clientY = t.clientY;
  } else if ('changedTouches' in native && (native as TouchEvent).changedTouches.length > 0) {
    const t = (native as TouchEvent).changedTouches[0];
    clientX = t.clientX;
    clientY = t.clientY;
  }
  const x = clientX != null ? clientX - rect.left : 0;
  const y = clientY != null ? clientY - rect.top : 0;
  const root = runtime.getRootWidget?.() ?? null;
  const isKeyboard = type === 'keydown' || type === 'keyup' || type === 'keypress';
  const target = isKeyboard ? root : hitTest(root, x, y);
  if (!target || !root) {
    currentRuntime = null;
    return;
  }
  dispatchToTree(root, target, type, x, y, native);
  currentRuntime = null;
}

export function dispatchToTree(
  root: Widget,
  target: Widget,
  type: EventType,
  x: number,
  y: number,
  native?: Event,
): void {
  const path = buildPath(target);
  const ancestors = path.slice(0, Math.max(0, path.length - 1));
  for (const node of ancestors) {
    const ev = createEvent(type, target, node, EventPhase.Capture, x, y, native);
    const ok = invokeHandlers(node.key, type, ev, 'capture');
    if (!ok) {
      return;
    }
  }
  {
    const evCap = createEvent(type, target, target, EventPhase.Target, x, y, native);
    const okCap = invokeHandlers(target.key, type, evCap, 'capture');
    if (!okCap) {
      return;
    }
  }
  {
    const evTar = createEvent(type, target, target, EventPhase.Target, x, y, native);
    const okTar = invokeHandlers(target.key, type, evTar, 'bubble');
    if (!okTar) {
      return;
    }
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const node = ancestors[i];
    const ev = createEvent(type, target, node, EventPhase.Bubble, x, y, native);
    const ok = invokeHandlers(node.key, type, ev, 'bubble');
    if (!ok) {
      return;
    }
  }
}
