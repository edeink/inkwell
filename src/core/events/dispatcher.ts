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
import { EventRegistry } from './registry';
import { EventPhase, type EventType, type InkwellEvent } from './types';

import type { Widget } from '@/core/base';
import type Runtime from '@/runtime';

let currentRuntime: Runtime | null = null;

export function hitTest(root: Widget | null, x: number, y: number): Widget | null {
  if (!root) {
    return null;
  }
  return root.visitHitTest(x, y);
}

/**
 * 类方法解析：为给定事件类型与阶段生成可能的类方法名称列表
 * 设计说明：
 * - 优先支持类方法事件处理（例如 onClick / onClickCapture），并在同类型处理器中先于 JSX 属性触发。
 * - 采用最小映射策略：通用规则为 `on${PascalCase(type)}` 与 `on${PascalCase(type)}Capture`；
 *   同时为双击事件兼容 `onDblClick*` 与 `onDoubleClick*` 两种命名。
 */
function resolveMethodNames(type: EventType, phase: 'capture' | 'bubble'): string[] {
  const capSuffix = phase === 'capture' ? 'Capture' : '';
  switch (type) {
    case 'click':
      return [`onClick${capSuffix}`];
    case 'mousedown':
      return [`onMouseDown${capSuffix}`, `onPointerDown${capSuffix}`];
    case 'mouseup':
      return [`onMouseUp${capSuffix}`, `onPointerUp${capSuffix}`];
    case 'mousemove':
      return [`onMouseMove${capSuffix}`, `onPointerMove${capSuffix}`];
    case 'mouseover':
      return [`onMouseOver${capSuffix}`];
    case 'mouseout':
      return [`onMouseOut${capSuffix}`];
    case 'wheel':
      return [`onWheel${capSuffix}`];
    case 'dblclick':
      return [`onDblClick${capSuffix}`, `onDoubleClick${capSuffix}`];
    case 'contextmenu':
      return [`onContextMenu${capSuffix}`];
    case 'pointerdown':
      return [`onPointerDown${capSuffix}`];
    case 'pointerup':
      return [`onPointerUp${capSuffix}`];
    case 'pointermove':
      return [`onPointerMove${capSuffix}`];
    case 'pointerover':
      return [`onPointerOver${capSuffix}`];
    case 'pointerout':
      return [`onPointerOut${capSuffix}`];
    case 'pointerenter':
      return [`onPointerEnter${capSuffix}`];
    case 'pointerleave':
      return [`onPointerLeave${capSuffix}`];
    case 'mouseenter':
      return [`onMouseEnter${capSuffix}`];
    case 'mouseleave':
      return [`onMouseLeave${capSuffix}`];
    case 'focus':
      return [`onFocus${capSuffix}`];
    case 'blur':
      return [`onBlur${capSuffix}`];
    case 'touchstart':
      return [`onTouchStart${capSuffix}`, `onPointerDown${capSuffix}`, `onMouseDown${capSuffix}`];
    case 'touchmove':
      return [`onTouchMove${capSuffix}`, `onPointerMove${capSuffix}`, `onMouseMove${capSuffix}`];
    case 'touchend':
      return [`onTouchEnd${capSuffix}`, `onPointerUp${capSuffix}`, `onMouseUp${capSuffix}`];
    case 'touchcancel':
      return [`onTouchCancel${capSuffix}`, `onPointerUp${capSuffix}`, `onMouseUp${capSuffix}`];
    case 'keydown':
      return [`onKeyDown${capSuffix}`];
    case 'keyup':
      return [`onKeyUp${capSuffix}`];
    case 'keypress':
      return [`onKeyPress${capSuffix}`];
    default:
      return [`on${type}${capSuffix}`];
  }
}

function buildPath(target: Widget | null): Widget[] {
  const path: Widget[] = [];
  let cur = target;
  while (cur) {
    const peNone = cur.pointerEvent === 'none';
    if (!peNone) {
      path.push(cur);
    }
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
  // 提取修饰键
  const ne = native as MouseEvent | KeyboardEvent | undefined;

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
    altKey: ne?.altKey,
    ctrlKey: ne?.ctrlKey,
    metaKey: ne?.metaKey,
    shiftKey: ne?.shiftKey,
    stopPropagation() {
      stopped = true;
      if (native && typeof native.preventDefault === 'function') {
        native.preventDefault();
      }
    },
    get propagationStopped() {
      return stopped;
    },
  } as InkwellEvent;
}

function invokeHandlers(
  node: Widget,
  type: EventType,
  event: InkwellEvent,
  phase: 'capture' | 'bubble',
): boolean {
  // 1) 类方法优先调用：按解析出的候选方法顺序调用
  const methods = resolveMethodNames(type, phase);
  for (const name of methods) {
    const fn = (node as unknown as Record<string, unknown>)[name] as
      | ((e: InkwellEvent) => boolean | void)
      | undefined;
    if (typeof fn === 'function') {
      const ret = fn.call(node, event);
      if (event.propagationStopped === true) {
        return false;
      }
      if (ret === false) {
        return false;
      }
    }
  }

  // 2) JSX 属性注册的处理器：保持现有注册表行为与顺序
  const list = EventRegistry.getHandlers(node.key, type, currentRuntime);
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
  const canvas = raw?.canvas ?? runtime.container?.querySelector('canvas') ?? null;
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

  // 处理鼠标光标样式
  if ((type === 'mousemove' || type === 'pointermove') && canvas) {
    let cursor = 'default';
    let cur: Widget | null = target;
    while (cur) {
      if (cur.cursor) {
        cursor = cur.cursor;
        break;
      }
      cur = cur.parent;
    }
    if (canvas.style.cursor !== cursor) {
      canvas.style.cursor = cursor;
    }
  }

  // 合成 pointerenter / pointerleave 事件
  // 仅在 pointermove / mousemove 时处理
  // 注意：即使 target 为 null (移出有效区域)，我们也需要触发 leave 事件
  if ((type === 'pointermove' || type === 'mousemove') && root) {
    handleHoverEvents(runtime, root, target, x, y, native);
  }

  if (!target || !root) {
    currentRuntime = null;
    return;
  }

  dispatchToTree(root, target, type, x, y, native);
  currentRuntime = null;
}

const runtimeHoverState = new WeakMap<Runtime, Widget | null>();

function handleHoverEvents(
  runtime: Runtime,
  root: Widget,
  target: Widget | null,
  x: number,
  y: number,
  native: MouseEvent | WheelEvent | PointerEvent | TouchEvent | KeyboardEvent,
): void {
  const lastTarget = runtimeHoverState.get(runtime) || null;
  if (target === lastTarget) {
    return;
  }
  runtimeHoverState.set(runtime, target);

  // 1. Find LCA
  const lca = findLCA(lastTarget, target);

  // 2. Handle Leave (pointerout bubbles, pointerleave does not)
  if (lastTarget) {
    // pointerout triggers on the last target and bubbles
    dispatchToTree(root, lastTarget, 'pointerout', x, y, native);

    // pointerleave triggers on the chain from lastTarget up to LCA (exclusive)
    let curr: Widget | null = lastTarget;
    while (curr && curr !== lca) {
      dispatchDirect(curr, 'pointerleave', x, y, native);
      curr = curr.parent;
    }
  }

  // 3. Handle Enter (pointerover bubbles, pointerenter does not)
  if (target) {
    // pointerover triggers on the target and bubbles
    dispatchToTree(root, target, 'pointerover', x, y, native);

    // pointerenter triggers on the chain from LCA (exclusive) down to target
    const path = buildPath(target); // [root, ..., target]
    let startIndex = 0;
    if (lca) {
      startIndex = path.indexOf(lca) + 1;
    }
    for (let i = startIndex; i < path.length; i++) {
      dispatchDirect(path[i], 'pointerenter', x, y, native);
    }
  }
}

function findLCA(a: Widget | null, b: Widget | null): Widget | null {
  if (!a || !b) {
    return null;
  }
  const pathA = buildPath(a);
  const pathB = buildPath(b);
  let lca: Widget | null = null;
  for (let i = 0; i < Math.min(pathA.length, pathB.length); i++) {
    if (pathA[i] === pathB[i]) {
      lca = pathA[i];
    } else {
      break;
    }
  }
  return lca;
}

function dispatchDirect(
  node: Widget,
  type: EventType,
  x: number,
  y: number,
  native: MouseEvent | WheelEvent | PointerEvent | TouchEvent | KeyboardEvent,
) {
  // 直接分发不冒泡的事件 (enter/leave)
  // 我们同时触发 capture 和 bubble 阶段的处理器，以支持 onPointerEnter 和 onPointerEnterCapture
  const ev = createEvent(type, node, node, EventPhase.Target, x, y, native);
  invokeHandlers(node, type, ev, 'capture');
  invokeHandlers(node, type, ev, 'bubble');
}

export function dispatchToTree(
  root: Widget,
  target: Widget,
  type: EventType,
  x: number,
  y: number,
  native?: Event,
): void {
  const prevRuntime = currentRuntime;
  try {
    const rt = root.runtime ?? null;
    currentRuntime = rt;
  } catch {
    currentRuntime = null;
  }
  const path = buildPath(target);
  const ancestors = path.slice(0, Math.max(0, path.length - 1));
  for (const node of ancestors) {
    const ev = createEvent(type, target, node, EventPhase.Capture, x, y, native);
    const ok = invokeHandlers(node, type, ev, 'capture');
    if (!ok) {
      return;
    }
  }
  {
    const evCap = createEvent(type, target, target, EventPhase.Target, x, y, native);
    const okCap = invokeHandlers(target, type, evCap, 'capture');
    if (!okCap) {
      return;
    }
  }
  {
    const evTar = createEvent(type, target, target, EventPhase.Target, x, y, native);
    const okTar = invokeHandlers(target, type, evTar, 'bubble');
    if (!okTar) {
      return;
    }
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const node = ancestors[i];
    const ev = createEvent(type, target, node, EventPhase.Bubble, x, y, native);
    const ok = invokeHandlers(node, type, ev, 'bubble');
    if (!ok) {
      return;
    }
  }
  currentRuntime = prevRuntime;
}
