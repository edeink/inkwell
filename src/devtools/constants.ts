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
