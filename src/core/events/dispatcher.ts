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
import {
  CAPTURE_SUFFIX,
  DISPATCH_PHASE_BUBBLE,
  DISPATCH_PHASE_CAPTURE,
  EventTypes,
  isFunction,
  isKeyboardEventType,
  type DispatchPhase,
} from './constants';
import { EventRegistry } from './registry';
import { EventPhase, type EventType, type InkwellEvent } from './types';

import type { Widget } from '@/core/base';
import type Runtime from '@/runtime';

export function hitTest(root: Widget | null, x: number, y: number): Widget | null {
  if (!root) {
    return null;
  }
  const rt = root.runtime;
  const overlayRoot =
    (rt && 'getOverlayRootWidget' in rt && typeof rt.getOverlayRootWidget === 'function'
      ? (rt.getOverlayRootWidget() as Widget | null)
      : null) ?? null;
  if (overlayRoot) {
    const hit = overlayRoot.visitHitTest(x, y);
    if (hit) {
      return hit;
    }
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
function resolveMethodNames(type: EventType, phase: DispatchPhase): string[] {
  const capSuffix = phase === DISPATCH_PHASE_CAPTURE ? CAPTURE_SUFFIX : '';
  switch (type) {
    case EventTypes.Click:
      return [`onClick${capSuffix}`];
    case EventTypes.MouseDown:
      return [`onMouseDown${capSuffix}`, `onPointerDown${capSuffix}`];
    case EventTypes.MouseUp:
      return [`onMouseUp${capSuffix}`, `onPointerUp${capSuffix}`];
    case EventTypes.MouseMove:
      return [`onMouseMove${capSuffix}`, `onPointerMove${capSuffix}`];
    case EventTypes.MouseOver:
      return [`onMouseOver${capSuffix}`];
    case EventTypes.MouseOut:
      return [`onMouseOut${capSuffix}`];
    case EventTypes.Wheel:
      return [`onWheel${capSuffix}`];
    case EventTypes.DblClick:
      return [`onDblClick${capSuffix}`, `onDoubleClick${capSuffix}`];
    case EventTypes.ContextMenu:
      return [`onContextMenu${capSuffix}`];
    case EventTypes.PointerDown:
      return [`onPointerDown${capSuffix}`];
    case EventTypes.PointerUp:
      return [`onPointerUp${capSuffix}`];
    case EventTypes.PointerMove:
      return [`onPointerMove${capSuffix}`];
    case EventTypes.PointerOver:
      return [`onPointerOver${capSuffix}`];
    case EventTypes.PointerOut:
      return [`onPointerOut${capSuffix}`];
    case EventTypes.PointerEnter:
      return [`onPointerEnter${capSuffix}`];
    case EventTypes.PointerLeave:
      return [`onPointerLeave${capSuffix}`];
    case EventTypes.MouseEnter:
      return [`onMouseEnter${capSuffix}`];
    case EventTypes.MouseLeave:
      return [`onMouseLeave${capSuffix}`];
    case EventTypes.Focus:
      return [`onFocus${capSuffix}`];
    case EventTypes.Blur:
      return [`onBlur${capSuffix}`];
    case EventTypes.TouchStart:
      return [`onTouchStart${capSuffix}`, `onPointerDown${capSuffix}`, `onMouseDown${capSuffix}`];
    case EventTypes.TouchMove:
      return [`onTouchMove${capSuffix}`, `onPointerMove${capSuffix}`, `onMouseMove${capSuffix}`];
    case EventTypes.TouchEnd:
      return [`onTouchEnd${capSuffix}`, `onPointerUp${capSuffix}`, `onMouseUp${capSuffix}`];
    case EventTypes.TouchCancel:
      return [`onTouchCancel${capSuffix}`, `onPointerUp${capSuffix}`, `onMouseUp${capSuffix}`];
    case EventTypes.KeyDown:
      return [`onKeyDown${capSuffix}`];
    case EventTypes.KeyUp:
      return [`onKeyUp${capSuffix}`];
    case EventTypes.KeyPress:
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
      if (native && isFunction((native as { preventDefault?: unknown }).preventDefault)) {
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
  phase: DispatchPhase,
  runtime: Runtime | null,
): boolean {
  // 1) 类方法优先调用：按解析出的候选方法顺序调用
  const methods = resolveMethodNames(type, phase);
  for (const name of methods) {
    const fn = (node as unknown as Record<string, unknown>)[name] as
      | ((e: InkwellEvent) => boolean | void)
      | undefined;
    if (isFunction(fn)) {
      const ret = (fn as (e: InkwellEvent) => boolean | void).call(node, event);
      if (event.propagationStopped === true) {
        return false;
      }
      if (ret === false) {
        return false;
      }
    }
  }

  // 2) JSX 属性注册的处理器：保持现有注册表行为与顺序
  const list = EventRegistry.getHandlers(String(node.key), type, runtime);
  const ordered =
    phase === DISPATCH_PHASE_CAPTURE
      ? list.filter((h) => h.capture)
      : list.filter((h) => !h.capture);
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
  const renderer = runtime.getRenderer();
  const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
  const canvas = raw?.canvas ?? runtime.container?.querySelector('canvas') ?? null;
  if (!canvas) {
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
  const target = isKeyboardEventType(type) ? root : hitTest(root, x, y);

  // 处理鼠标光标样式
  if ((type === EventTypes.MouseMove || type === EventTypes.PointerMove) && canvas) {
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
    return;
  }

  dispatchToTreeInternal(root, target, type, x, y, native, runtime);
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

  // 1. 计算最近公共祖先 (LCA)
  const lca = findLCA(lastTarget, target);

  // 2. 处理离开 (Leave)
  // pointerout 会冒泡，而 pointerleave 不冒泡
  if (lastTarget) {
    // pointerout 在上一个目标触发并冒泡
    dispatchToTreeInternal(root, lastTarget, 'pointerout', x, y, native, runtime);

    // pointerleave 在从上一个目标到 LCA（不包含）的路径上触发
    let curr: Widget | null = lastTarget;
    while (curr && curr !== lca) {
      dispatchDirect(curr, 'pointerleave', x, y, native, runtime);
      curr = curr.parent;
    }
  }

  // 3. 处理进入 (Enter)
  // pointerover 会冒泡，而 pointerenter 不冒泡
  if (target) {
    // pointerover 在目标触发并冒泡
    dispatchToTreeInternal(root, target, 'pointerover', x, y, native, runtime);

    // pointerenter 在从 LCA（不包含）到目标的路径上触发
    const path = buildPath(target); // [root, ..., target]
    let startIndex = 0;
    if (lca) {
      startIndex = path.indexOf(lca) + 1;
    }
    for (let i = startIndex; i < path.length; i++) {
      dispatchDirect(path[i], 'pointerenter', x, y, native, runtime);
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
  runtime: Runtime | null,
) {
  // 直接分发不冒泡的事件 (enter/leave)
  // 我们同时触发 capture 和 bubble 阶段的处理器，以支持 onPointerEnter 和 onPointerEnterCapture
  const ev = createEvent(type, node, node, EventPhase.Target, x, y, native);
  invokeHandlers(node, type, ev, DISPATCH_PHASE_CAPTURE, runtime);
  invokeHandlers(node, type, ev, DISPATCH_PHASE_BUBBLE, runtime);
}

export function dispatchToTree(
  root: Widget,
  target: Widget,
  type: EventType,
  x: number,
  y: number,
  native?: Event,
): void {
  dispatchToTreeInternal(root, target, type, x, y, native, root.runtime ?? null);
}

function dispatchToTreeInternal(
  root: Widget,
  target: Widget,
  type: EventType,
  x: number,
  y: number,
  native: Event | undefined,
  runtime: Runtime | null,
): void {
  const path = buildPath(target);
  const ancestors = path.slice(0, Math.max(0, path.length - 1));
  for (const node of ancestors) {
    const ev = createEvent(type, target, node, EventPhase.Capture, x, y, native);
    const ok = invokeHandlers(node, type, ev, DISPATCH_PHASE_CAPTURE, runtime);
    if (!ok) {
      return;
    }
  }
  {
    const evCap = createEvent(type, target, target, EventPhase.Target, x, y, native);
    const okCap = invokeHandlers(target, type, evCap, DISPATCH_PHASE_CAPTURE, runtime);
    if (!okCap) {
      return;
    }
  }
  {
    const evTar = createEvent(type, target, target, EventPhase.Target, x, y, native);
    const okTar = invokeHandlers(target, type, evTar, DISPATCH_PHASE_BUBBLE, runtime);
    if (!okTar) {
      return;
    }
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const node = ancestors[i];
    const ev = createEvent(type, target, node, EventPhase.Bubble, x, y, native);
    const ok = invokeHandlers(node, type, ev, DISPATCH_PHASE_BUBBLE, runtime);
    if (!ok) {
      return;
    }
  }
}
