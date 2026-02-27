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

export const DEVTOOLS_IDS = {
  ROOT: 'inkwell-devtools-root',
} as const;

export const DEVTOOLS_CLASSES = {
  PANEL: 'ink-devtools-panel',
  UI_SELECT_DROPDOWN: 'ink-ui-select-dropdown',
  UI_SELECT_ROOT: 'ink-ui-select',
  UI_SELECT_TRIGGER: 'ink-ui-select-trigger',
  UI_COLOR_PICKER_PANEL: 'ink-ui-color-picker-panel',
  UI_COLOR_PICKER_ROOT: 'ink-ui-color-picker',
  UI_COLOR_PICKER_TRIGGER: 'ink-ui-color-picker-trigger',
} as const;

export const DEVTOOLS_DOM_TAGS = {
  CANVAS: 'canvas',
} as const;

export const DEVTOOLS_CSS = {
  PANEL_CLASS: DEVTOOLS_CLASSES.PANEL,
  PANEL_SELECTOR: `.${DEVTOOLS_CLASSES.PANEL}`,
} as const;

export const DEVTOOLS_GLOBAL = {
  STATE_KEY: '__INKWELL_DEVTOOLS_SINGLETON__',
  BOOTSTRAP_DETAIL_KEY: '__inkwellDevtoolsBootstrap',
} as const;

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
  ROOT_ID: DEVTOOLS_IDS.ROOT,
  ROOT_SELECTOR: `#${DEVTOOLS_IDS.ROOT}`,
  EDITABLE_FOCUSABLE: `input, textarea, select, button, [contenteditable="true"], .${DEVTOOLS_CLASSES.UI_SELECT_TRIGGER}, .${DEVTOOLS_CLASSES.UI_COLOR_PICKER_TRIGGER}`,
  UI_SELECT_DROPDOWN: `.${DEVTOOLS_CLASSES.UI_SELECT_DROPDOWN}`,
  UI_SELECT_ROOT: `.${DEVTOOLS_CLASSES.UI_SELECT_ROOT}`,
  UI_COLOR_PICKER_PANEL: `.${DEVTOOLS_CLASSES.UI_COLOR_PICKER_PANEL}`,
  UI_COLOR_PICKER_ROOT: `.${DEVTOOLS_CLASSES.UI_COLOR_PICKER_ROOT}`,
} as const;

export const DEVTOOLS_PLACEMENT = {
  TOP: 'top',
  BOTTOM: 'bottom',
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

export function isTypeString(v: unknown): v is string {
  return typeof v === JS_TYPE.STRING;
}

export function isTypeObject(v: unknown): v is object {
  return typeof v === JS_TYPE.OBJECT && v !== null;
}
