/**
 * Devtools 常量与工具函数
 *
 * 汇总事件、调试配置、日志与性能采样工具。
 * 注意事项：部分函数会访问全局对象与运行时环境。
 * 潜在副作用：可能输出日志或注册/统计运行时调用。
 */
export const DEVTOOLS_EVENTS = {
  OPEN: 'INKWELL_DEVTOOLS_OPEN',
  CLOSE: 'INKWELL_DEVTOOLS_CLOSE',
  INSPECT_TOGGLE: 'INKWELL_DEVTOOLS_INSPECT_TOGGLE',
} as const;

export const DEVTOOLS_DOM = {
  ROOT_ID: 'inkwell-devtools-root',
  ROOT_SELECTOR: '#inkwell-devtools-root',
} as const;

export const DEVTOOLS_DOM_TAGS = {
  CANVAS: 'canvas',
} as const;

export const DEVTOOLS_CSS = {
  PANEL_CLASS: 'ink-devtools-panel',
  PANEL_SELECTOR: '.ink-devtools-panel',
} as const;

export const DEVTOOLS_GLOBAL = {
  STATE_KEY: '__INKWELL_DEVTOOLS_SINGLETON__',
  BOOTSTRAP_DETAIL_KEY: '__inkwellDevtoolsBootstrap',
} as const;

export const DEVTOOLS_LOG = {
  PREFIX: '[DevTools]',
  UNMOUNT_FAIL: '卸载失败:',
  REMOVE_CONTAINER_FAIL: '移除容器失败:',
  MOUNT_FAIL: '挂载失败:',
  HIT_TEST_FAIL: '命中测试失败:',
  NO_SELECTED_NODE: '未选中节点',
} as const;

export const DEVTOOLS_DEBUG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export const DEVTOOLS_DEBUG_ENV = {
  ENABLE: 'INKWELL_DEVTOOLS_DEBUG',
  LEVEL: 'INKWELL_DEVTOOLS_LOG_LEVEL',
  SAMPLE: 'INKWELL_DEVTOOLS_LOG_SAMPLE',
} as const;

export type DevtoolsDebugLevel = (typeof DEVTOOLS_DEBUG_LEVEL)[keyof typeof DEVTOOLS_DEBUG_LEVEL];

type DevtoolsDebugConfig = {
  enabled: boolean;
  level: DevtoolsDebugLevel;
  sampleRate: number;
};

type DevtoolsCallStat = {
  count: number;
  windowCount: number;
  windowStart: number;
  lastAt: number;
  lastStack?: string;
  lastWarnWindowStart?: number;
};

const devtoolsDebugState: {
  config: DevtoolsDebugConfig | null;
  calls: Map<string, DevtoolsCallStat>;
  listeners: { add: number; remove: number };
  timers: { setTimeout: number; clearTimeout: number; setInterval: number; clearInterval: number };
  raf: { request: number; cancel: number };
} = {
  config: null,
  calls: new Map(),
  listeners: { add: 0, remove: 0 },
  timers: { setTimeout: 0, clearTimeout: 0, setInterval: 0, clearInterval: 0 },
  raf: { request: 0, cancel: 0 },
};

function readDevtoolsEnv(key: string): string | undefined {
  const metaEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta.env as Record<string, unknown> | undefined)
      : undefined;
  const env = metaEnv ?? undefined;
  if (env && key in env) {
    const v = env[key];
    return typeof v === 'string' ? v : String(v);
  }
  const g = globalThis as Record<string, unknown>;
  if (key in g) {
    return typeof g[key] === 'string' ? (g[key] as string) : String(g[key]);
  }
  return undefined;
}

function resolveDebugConfig(): DevtoolsDebugConfig {
  const envEnabled = readDevtoolsEnv(DEVTOOLS_DEBUG_ENV.ENABLE);
  const enableFromEnv = envEnabled === '1' || envEnabled === 'true';
  let enableFromQuery = false;
  if (typeof location !== 'undefined') {
    const qs = new URLSearchParams(location.search);
    const v = qs.get('inkwellDevtoolsDebug') ?? qs.get('devtoolsDebug');
    enableFromQuery = v === '1' || v === 'true';
  }
  const enabled = enableFromEnv || enableFromQuery;
  const rawLevel = readDevtoolsEnv(DEVTOOLS_DEBUG_ENV.LEVEL);
  const level = isDevtoolsDebugLevel(rawLevel) ? rawLevel : DEVTOOLS_DEBUG_LEVEL.INFO;
  const rawSample = readDevtoolsEnv(DEVTOOLS_DEBUG_ENV.SAMPLE);
  const sampleRate = rawSample ? Math.min(1, Math.max(0, Number(rawSample))) : 1;
  return { enabled, level, sampleRate: Number.isFinite(sampleRate) ? sampleRate : 1 };
}

/**
 * 读取 Devtools 调试配置
 *
 * @returns 调试配置对象
 * @remarks
 * 注意事项：结果会被缓存，避免重复解析环境变量。
 * 潜在副作用：首次调用时读取全局环境变量与 URL 查询。
 */
export function getDevtoolsDebugConfig(): DevtoolsDebugConfig {
  if (!devtoolsDebugState.config) {
    devtoolsDebugState.config = resolveDebugConfig();
  }
  return devtoolsDebugState.config;
}

function levelOrder(level: DevtoolsDebugLevel): number {
  switch (level) {
    case DEVTOOLS_DEBUG_LEVEL.DEBUG:
      return 10;
    case DEVTOOLS_DEBUG_LEVEL.INFO:
      return 20;
    case DEVTOOLS_DEBUG_LEVEL.WARN:
      return 30;
    default:
      return 40;
  }
}

function isDevtoolsDebugLevel(value: string | undefined): value is DevtoolsDebugLevel {
  return (
    value === DEVTOOLS_DEBUG_LEVEL.DEBUG ||
    value === DEVTOOLS_DEBUG_LEVEL.INFO ||
    value === DEVTOOLS_DEBUG_LEVEL.WARN ||
    value === DEVTOOLS_DEBUG_LEVEL.ERROR
  );
}

function shouldLog(level: DevtoolsDebugLevel): boolean {
  const cfg = getDevtoolsDebugConfig();
  if (!cfg.enabled) {
    return false;
  }
  if (cfg.sampleRate < 1 && Math.random() > cfg.sampleRate) {
    return false;
  }
  return levelOrder(level) >= levelOrder(cfg.level);
}

/**
 * 输出 Devtools 调试日志
 *
 * @param level 日志级别
 * @param message 日志文本
 * @param detail 结构化附加信息
 * @returns void
 * @remarks
 * 注意事项：受调试开关与采样率控制。
 * 潜在副作用：向 console 输出日志。
 */
export function devtoolsLog(
  level: DevtoolsDebugLevel,
  message: string,
  detail?: Record<string, unknown>,
): void {
  if (!shouldLog(level)) {
    return;
  }
  const now = new Date().toISOString();
  const payload = detail ? { 时间: now, ...detail } : { 时间: now };
  const prefix = DEVTOOLS_LOG.PREFIX;
  if (level === DEVTOOLS_DEBUG_LEVEL.ERROR) {
    console.error(prefix, message, payload);
    return;
  }
  if (level === DEVTOOLS_DEBUG_LEVEL.WARN) {
    console.warn(prefix, message, payload);
    return;
  }
  if (level === DEVTOOLS_DEBUG_LEVEL.DEBUG) {
    console.debug(prefix, message, payload);
    return;
  }
  console.info(prefix, message, payload);
}

/**
 * 开始计时
 *
 * @param label 计时标签
 * @param detail 附加信息
 * @returns void
 * @remarks
 * 注意事项：仅在 debug 日志开启时生效。
 * 潜在副作用：向 console 写入计时与日志。
 */
export function devtoolsTimeStart(label: string, detail?: Record<string, unknown>): void {
  if (!shouldLog(DEVTOOLS_DEBUG_LEVEL.DEBUG)) {
    return;
  }
  console.time(`${DEVTOOLS_LOG.PREFIX} ${label}`);
  if (detail) {
    devtoolsLog(DEVTOOLS_DEBUG_LEVEL.DEBUG, `${label}开始`, detail);
  }
}

/**
 * 结束计时
 *
 * @param label 计时标签
 * @param detail 附加信息
 * @returns void
 * @remarks
 * 注意事项：需与 devtoolsTimeStart 成对调用。
 * 潜在副作用：向 console 写入计时与日志。
 */
export function devtoolsTimeEnd(label: string, detail?: Record<string, unknown>): void {
  if (!shouldLog(DEVTOOLS_DEBUG_LEVEL.DEBUG)) {
    return;
  }
  console.timeEnd(`${DEVTOOLS_LOG.PREFIX} ${label}`);
  if (detail) {
    devtoolsLog(DEVTOOLS_DEBUG_LEVEL.DEBUG, `${label}结束`, detail);
  }
}

/**
 * 记录 effect 生命周期日志
 *
 * @param name effect 名称
 * @param phase 生命周期阶段
 * @param detail 附加信息
 * @returns void
 * @remarks
 * 注意事项：仅用于调试场景。
 * 潜在副作用：向 console 输出日志。
 */
export function devtoolsLogEffect(
  name: string,
  phase: 'start' | 'cleanup',
  detail?: Record<string, unknown>,
): void {
  devtoolsLog(DEVTOOLS_DEBUG_LEVEL.DEBUG, 'useEffect', {
    名称: name,
    阶段: phase === 'start' ? '执行' : '清理',
    ...detail,
  });
}

/**
 * 记录状态变更日志
 *
 * @param name 状态名称
 * @param prev 旧值
 * @param next 新值
 * @param detail 附加信息
 * @returns void
 * @remarks
 * 注意事项：用于排查状态更新链路。
 * 潜在副作用：向 console 输出日志。
 */
export function devtoolsLogState<T>(
  name: string,
  prev: T,
  next: T,
  detail?: Record<string, unknown>,
): void {
  devtoolsLog(DEVTOOLS_DEBUG_LEVEL.DEBUG, 'setState', {
    状态: name,
    前值: prev,
    后值: next,
    ...detail,
  });
}

/**
 * 统一解析状态更新参数
 *
 * @param name 状态名称
 * @param prev 旧值
 * @param next 新值或基于旧值的计算函数
 * @returns 解析后的新值
 * @remarks
 * 注意事项：会输出状态日志。
 * 潜在副作用：向 console 输出日志。
 */
export function devtoolsResolveStateUpdate<T>(
  name: string,
  prev: T,
  next: T | ((current: T) => T),
): T {
  const resolved = typeof next === 'function' ? (next as (current: T) => T)(prev) : next;
  devtoolsLogState(name, prev, resolved);
  return resolved;
}

/**
 * 统计短时间内的重复调用次数
 *
 * @param name 统计名称
 * @param options 窗口大小与阈值配置
 * @returns void
 * @remarks
 * 注意事项：仅在 debug 开启时生效。
 * 潜在副作用：可能输出警告日志与调用栈。
 */
export function devtoolsCount(
  name: string,
  options?: { windowMs?: number; threshold?: number },
): void {
  if (!shouldLog(DEVTOOLS_DEBUG_LEVEL.DEBUG)) {
    return;
  }
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const windowMs = options?.windowMs ?? 1000;
  const threshold = options?.threshold ?? 6;
  const stat = devtoolsDebugState.calls.get(name) ?? {
    count: 0,
    windowCount: 0,
    windowStart: now,
    lastAt: now,
  };
  stat.count += 1;
  if (now - stat.windowStart > windowMs) {
    stat.windowStart = now;
    stat.windowCount = 0;
    stat.lastWarnWindowStart = undefined;
  }
  stat.windowCount += 1;
  stat.lastAt = now;
  if (stat.windowCount === threshold && stat.lastWarnWindowStart !== stat.windowStart) {
    stat.lastWarnWindowStart = stat.windowStart;
    stat.lastStack = new Error().stack;
    devtoolsLog(DEVTOOLS_DEBUG_LEVEL.WARN, '触发重复调用阈值', {
      名称: name,
      次数: stat.windowCount,
      窗口毫秒: windowMs,
      调用栈: stat.lastStack ?? '',
    });
  }
  devtoolsDebugState.calls.set(name, stat);
}

/**
 * 统计事件监听的增减
 *
 * @param action 操作类型
 * @param type 事件类型
 * @param target 监听目标标识
 * @returns void
 * @remarks
 * 注意事项：仅用于调试统计，不影响实际监听逻辑。
 * 潜在副作用：会输出调试日志。
 */
export function devtoolsTrackEventListener(
  action: 'add' | 'remove',
  type: string,
  target: string,
): void {
  if (action === 'add') {
    devtoolsDebugState.listeners.add += 1;
  } else {
    devtoolsDebugState.listeners.remove += 1;
  }
  devtoolsLog(DEVTOOLS_DEBUG_LEVEL.DEBUG, '事件监听变更', {
    操作: action,
    事件: type,
    目标: target,
    已添加: devtoolsDebugState.listeners.add,
    已移除: devtoolsDebugState.listeners.remove,
  });
}

/**
 * 统计定时器的增减
 *
 * @param action 操作类型
 * @param kind 定时器类型
 * @returns void
 * @remarks
 * 注意事项：仅用于调试统计。
 * 潜在副作用：会输出调试日志。
 */
export function devtoolsTrackTimer(action: 'set' | 'clear', kind: 'timeout' | 'interval'): void {
  if (kind === 'timeout') {
    if (action === 'set') {
      devtoolsDebugState.timers.setTimeout += 1;
    } else {
      devtoolsDebugState.timers.clearTimeout += 1;
    }
  } else if (action === 'set') {
    devtoolsDebugState.timers.setInterval += 1;
  } else {
    devtoolsDebugState.timers.clearInterval += 1;
  }
  devtoolsLog(DEVTOOLS_DEBUG_LEVEL.DEBUG, '定时器变更', {
    操作: action,
    类型: kind,
    setTimeout: devtoolsDebugState.timers.setTimeout,
    clearTimeout: devtoolsDebugState.timers.clearTimeout,
    setInterval: devtoolsDebugState.timers.setInterval,
    clearInterval: devtoolsDebugState.timers.clearInterval,
  });
}

/**
 * 统计 requestAnimationFrame 的调度
 *
 * @param action 操作类型
 * @returns void
 * @remarks
 * 注意事项：仅用于调试统计。
 * 潜在副作用：会输出调试日志。
 */
export function devtoolsTrackRaf(action: 'request' | 'cancel'): void {
  if (action === 'request') {
    devtoolsDebugState.raf.request += 1;
  } else {
    devtoolsDebugState.raf.cancel += 1;
  }
  devtoolsLog(DEVTOOLS_DEBUG_LEVEL.DEBUG, '帧调度变更', {
    操作: action,
    request: devtoolsDebugState.raf.request,
    cancel: devtoolsDebugState.raf.cancel,
  });
}

/**
 * 获取资源使用快照
 *
 * @returns 资源统计信息
 * @remarks
 * 注意事项：DOM 计数仅在浏览器环境可用。
 * 潜在副作用：会读取 document。
 */
export function devtoolsGetResourceSnapshot(): Record<string, unknown> {
  const domCount = typeof document !== 'undefined' ? document.getElementsByTagName('*').length : 0;
  return {
    DOM数量: domCount,
    事件添加: devtoolsDebugState.listeners.add,
    事件移除: devtoolsDebugState.listeners.remove,
    setTimeout: devtoolsDebugState.timers.setTimeout,
    clearTimeout: devtoolsDebugState.timers.clearTimeout,
    setInterval: devtoolsDebugState.timers.setInterval,
    clearInterval: devtoolsDebugState.timers.clearInterval,
    requestAnimationFrame: devtoolsDebugState.raf.request,
    cancelAnimationFrame: devtoolsDebugState.raf.cancel,
  };
}

/**
 * 获取内存使用快照
 *
 * @returns 内存统计信息
 * @remarks
 * 注意事项：依赖浏览器 performance.memory 能力。
 * 潜在副作用：读取 performance 对象。
 */
export function devtoolsGetMemorySnapshot(): Record<string, unknown> {
  if (typeof performance === 'undefined') {
    return { 可用: false };
  }
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
  };
  const memory = perf.memory;
  if (!memory) {
    return { 可用: false };
  }
  return {
    可用: true,
    已用: memory.usedJSHeapSize,
    总量: memory.totalJSHeapSize,
    上限: memory.jsHeapSizeLimit,
  };
}

export const DEVTOOLS_DOCK = {
  LEFT: 'left',
  RIGHT: 'right',
  TOP: 'top',
  BOTTOM: 'bottom',
} as const;

export const DEVTOOLS_PROP_PREFIX = {
  INTERNAL: '__',
} as const;

export const DEVTOOLS_PROP_KEYS = {
  KEY: 'key',
  REF: 'ref',
  CHILDREN: 'children',
  STATE: 'state',
  INKWELL_TYPE: '__inkwellType',
} as const;

export const DEVTOOLS_WIDGET_INFO_KEYS = {
  TYPE: 'type',
} as const;

export const DEVTOOLS_DOM_EVENTS = {
  KEYDOWN: 'keydown',
  VISIBILITYCHANGE: 'visibilitychange',
  RESIZE: 'resize',
  MOUSEMOVE: 'mousemove',
  MOUSEUP: 'mouseup',
  CLICK: 'click',
  SCROLL: 'scroll',
  POINTERDOWN: 'pointerdown',
} as const;

export const DEVTOOLS_DOM_EVENT_OPTIONS = {
  PASSIVE_TRUE: { passive: true } as const,
  CAPTURE_TRUE: true,
} as const;

export const DEVTOOLS_DOM_ATTRIBUTES = {
  STYLE: 'style',
  CLASS: 'class',
} as const;

export const DEVTOOLS_SELECTORS = {
  EDITABLE_FOCUSABLE:
    'input, textarea, select, button, [contenteditable="true"], .ink-ui-select-trigger, .ink-ui-color-picker-trigger',
  UI_SELECT_DROPDOWN: '.ink-ui-select-dropdown',
  UI_SELECT_ROOT: '.ink-ui-select',
  UI_COLOR_PICKER_PANEL: '.ink-ui-color-picker-panel',
  UI_COLOR_PICKER_ROOT: '.ink-ui-color-picker',
} as const;

export const DEVTOOLS_TRIGGER = {
  CLICK: DEVTOOLS_DOM_EVENTS.CLICK,
} as const;

export const DEVTOOLS_PLACEMENT = {
  TOP: 'top',
  BOTTOM: 'bottom',
} as const;

export const DEVTOOLS_TOOLTIP = {
  INSPECT: 'Inspect',
  HELP: '帮助',
  CLOSE: '关闭',
  DOCK_LEFT: '靠左',
  DOCK_RIGHT: '靠右',
  DOCK_TOP: '靠上',
  DOCK_BOTTOM: '靠下',
  PROTECTED_PROP: '受保护属性',
  OBJECT_KEY_UNEDITABLE: '对象键不可编辑',
  KEY_AUTO: 'Key 由系统自动生成',
  KEY_USER: 'Key 由用户显式指定',
} as const;

export const DEVTOOLS_ARIA = {
  DOCK_LEFT: 'dock-left',
  DOCK_RIGHT: 'dock-right',
  DOCK_TOP: 'dock-top',
  DOCK_BOTTOM: 'dock-bottom',
  MORE_INFO: '更多信息',
} as const;

export const JS_TYPE = {
  STRING: 'string',
  OBJECT: 'object',
  UNDEFINED: 'undefined',
} as const;

export const HOTKEY_ACTION = {
  OPEN: 'open',
  TOGGLE: 'toggle',
  INSPECT: 'inspect',
  CLOSE: 'close',
} as const;

export type HotkeyAction = (typeof HOTKEY_ACTION)[keyof typeof HOTKEY_ACTION];

export const DEVTOOLS_HELP_TEXT = {
  TITLE: '帮助',
  GROUP_TOP_ICONS: '顶部图标',
  GROUP_TREE_PANEL: 'Tree 面板',
  GROUP_SHORTCUT: '快捷键',
  ITEM_PICK_TITLE: '拾取',
  ITEM_PICK_DESC: '悬浮高亮，点击选中',
  ITEM_CLOSE_TITLE: '关闭',
  ITEM_CLOSE_DESC: '隐藏面板',
  ITEM_SEARCH_TITLE: '搜索',
  ITEM_SEARCH_DESC: '过滤组件树',
  ITEM_BREADCRUMB_TITLE: '面包屑',
  ITEM_BREADCRUMB_DESC: '快速跳转到路径节点',
  ITEM_PRINT_TITLE: '打印当前节点',
  ITEM_PRINT_DESC: '在控制台输出当前选中的 Widget 对象',
  SHORTCUT_DESC_PICK: '切换拾取模式',
  SHORTCUT_DESC_CLOSE: '关闭面板',
  SHORTCUT_DESC_OPEN: '打开面板',
} as const;

export const DEVTOOLS_OBJECT_EDITOR_TEXT = {
  PLACEHOLDER_SELECT: '请选择',
  BOOL_TRUE: 'true',
  BOOL_FALSE: 'false',
  HIDDEN_PROPS_TITLE: '内部属性',
  HIDDEN_PROPS_BUTTON_PREFIX: '已隐藏 ',
  HIDDEN_PROPS_BUTTON_SUFFIX: ' 个内部属性',
  ADD_PROP: '添加属性',
} as const;

export const DEVTOOLS_PROPS_EDITOR_TEXT = {
  EMPTY_TITLE: '未选择节点',
  EMPTY_DESC: '选择节点后展示可编辑属性',
  EMPTY_STEP_TREE: '点击 Tree 节点',
  EMPTY_STEP_OR: '或点击顶部 ',
  EMPTY_STEP_PICK_SUFFIX: ' 在画布上选取',
  GROUP_WIDGET_INFO: '组件信息',
  GROUP_RENDER_OBJECT: 'RenderObject',
  GROUP_CONSTRAINTS: '约束',
  GROUP_MISC: '其它信息',
  GROUP_EVENT_PROPS: '事件属性',
  GROUP_EVENT_BINDINGS: '事件绑定',
  CALLBACK_COUNT: '回调数',
} as const;

export const DEVTOOLS_TREE_PANE_TEXT = {
  SEARCH_PLACEHOLDER: '搜索节点...',
  MULTI_RUNTIME_TIP:
    '检测到当前页面存在多个 runtime。激活 inspect 模式后，将鼠标移动到目标 canvas 上可切换对应的 runtime。',
  PRINT_SELECTED: '打印当前节点',
} as const;

export function formatSiblingDuplicateKeyError(
  widgetType: string | null | undefined,
  widgetKey: unknown,
  duplicateKeys: unknown[],
): string {
  return (
    '错误：' +
    String(widgetType) +
    ' [' +
    String(widgetKey) +
    '] 下同级 key 重复：' +
    duplicateKeys.map((k) => String(k)).join(', ')
  );
}

export function formatHiddenInternalProps(count: number): string {
  return (
    DEVTOOLS_OBJECT_EDITOR_TEXT.HIDDEN_PROPS_BUTTON_PREFIX +
    String(count) +
    DEVTOOLS_OBJECT_EDITOR_TEXT.HIDDEN_PROPS_BUTTON_SUFFIX
  );
}

export function isTypeString(v: unknown): v is string {
  return typeof v === JS_TYPE.STRING;
}

export function isTypeObject(v: unknown): v is object {
  return typeof v === JS_TYPE.OBJECT && v !== null;
}
