/**
 * 功能开关状态模块
 *
 * 负责功能开关的持久化、分组与状态统计。
 * 注意事项：读写 localStorage 需要浏览器环境。
 * 潜在副作用：写入本地存储与触发响应式更新。
 */
import { computed, makeAutoObservable } from 'mobx';

/**
 * 功能开关项
 *
 * 注意事项：key 必须唯一。
 * 潜在副作用：无。
 */
export type FeatureToggleItem = {
  key: string;
  label: string;
  description: string;
  defaultValue: boolean;
  group?: string;
};

const STORAGE_KEY = '__INKWELL_FEATURE_TOGGLES__';

type ToggleStore = Record<string, boolean>;

/**
 * 读取开关状态
 *
 * @returns 本地存储中的开关映射
 * @remarks
 * 注意事项：非浏览器环境返回空对象。
 * 潜在副作用：读取 localStorage。
 */
function readToggleStore(): ToggleStore {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as ToggleStore;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

/**
 * 写入开关状态
 *
 * @param next 新的开关映射
 * @returns void
 * @remarks
 * 注意事项：写入失败会被吞掉。
 * 潜在副作用：写入 localStorage。
 */
function writeToggleStore(next: ToggleStore): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    void error;
  }
}

/**
 * 功能开关配置列表
 *
 * 注意事项：需保持 key 与业务一致。
 * 潜在副作用：无。
 */
export const FEATURE_TOGGLES: FeatureToggleItem[] = [
  {
    key: 'FEATURE_DEVTOOLS_TREE_HASH',
    label: 'DevTools 树哈希更新',
    description: '控制运行时树哈希计算与版本刷新',
    defaultValue: true,
    group: 'DevTools',
  },
  {
    key: 'FEATURE_DEVTOOLS_TREE_BUILD',
    label: 'DevTools 树结构构建',
    description: '控制树数据构建与渲染',
    defaultValue: true,
    group: 'DevTools',
  },
  {
    key: 'FEATURE_DEVTOOLS_MOUSE_LISTENER',
    label: 'DevTools 鼠标监听',
    description: '控制鼠标移动与点击监听',
    defaultValue: true,
    group: 'DevTools',
  },
  {
    key: 'FEATURE_DEVTOOLS_MOUSE_HIT_TEST',
    label: 'DevTools 命中测试',
    description: '控制指针命中测试与悬停更新',
    defaultValue: true,
    group: 'DevTools',
  },
  {
    key: 'FEATURE_DEVTOOLS_OVERLAY',
    label: 'DevTools 高亮覆盖层',
    description: '控制元素高亮与提示层渲染',
    defaultValue: true,
    group: 'DevTools',
  },
  {
    key: 'FEATURE_DEVTOOLS_TREE_HOVER_SYNC',
    label: 'DevTools 树悬停同步',
    description: '控制树悬停与高亮联动',
    defaultValue: true,
    group: 'DevTools',
  },
  {
    key: 'FEATURE_DEVTOOLS_LAYOUT_RESIZE',
    label: 'DevTools 面板拖拽缩放',
    description: '控制面板拖拽调整与分割拖拽',
    defaultValue: true,
    group: 'DevTools',
  },
  {
    key: 'FEATURE_MINDMAP_ZOOM_DRAG',
    label: 'Mindmap 缩放条拖拽',
    description: '控制缩放条拖拽与指针监听',
    defaultValue: true,
    group: 'Demo',
  },
];

/**
 * 功能开关分组结构
 *
 * 注意事项：由 FeatureToggleStore 计算生成。
 * 潜在副作用：无。
 */
export type FeatureToggleGroup = {
  key: string;
  label: string;
  items: FeatureToggleItem[];
};

/**
 * FeatureToggleStore
 *
 * 维护功能开关的持久化状态与分组信息。
 * 注意事项：groups 为派生数据。
 * 潜在副作用：写入本地存储。
 */
export class FeatureToggleStore {
  toggleState: ToggleStore;
  reactRenderCount = 0;

  constructor() {
    this.toggleState = readToggleStore();
    makeAutoObservable(this, {
      groups: computed.struct,
    });
  }

  /**
   * 获取分组后的功能开关
   *
   * @returns 分组列表
   * @remarks
   * 注意事项：以 group 字段分组，缺省归为“其他”。
   * 潜在副作用：无。
   */
  get groups(): FeatureToggleGroup[] {
    const groups: Record<string, FeatureToggleItem[]> = {};
    for (const item of FEATURE_TOGGLES) {
      const key = item.group ?? '其他';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    return Object.keys(groups).map((key) => ({
      key,
      label: key,
      items: groups[key],
    }));
  }

  /**
   * 判断功能是否启用
   *
   * @param key 功能 key
   * @param defaultValue 默认值
   * @returns 是否启用
   * @remarks
   * 注意事项：未命中存储时回退到默认值。
   * 潜在副作用：无。
   */
  isEnabled(key: string, defaultValue = true): boolean {
    if (Object.prototype.hasOwnProperty.call(this.toggleState, key)) {
      return !!this.toggleState[key];
    }
    return defaultValue;
  }

  /**
   * 更新功能开关
   *
   * @param key 功能 key
   * @param value 开关值
   * @returns void
   * @remarks
   * 注意事项：会写入本地存储。
   * 潜在副作用：触发 localStorage 写入。
   */
  setEnabled(key: string, value: boolean): void {
    this.toggleState = { ...this.toggleState, [key]: value };
    writeToggleStore(this.toggleState);
  }

  /**
   * 记录 React 渲染次数
   *
   * @returns void
   * @remarks
   * 注意事项：仅用于调试统计。
   * 潜在副作用：无。
   */
  markReactRender(): void {
    this.reactRenderCount += 1;
  }
}

/**
 * 全局功能开关 store 实例
 *
 * 注意事项：应作为单例使用。
 * 潜在副作用：构造时读取本地存储。
 */
export const featureToggleStore = new FeatureToggleStore();

/**
 * 读取功能开关
 *
 * @param key 功能 key
 * @param defaultValue 默认值
 * @returns 是否启用
 * @remarks
 * 注意事项：未命中时回退默认值。
 * 潜在副作用：无。
 */
export function getFeatureToggle(key: string, defaultValue = true): boolean {
  return featureToggleStore.isEnabled(key, defaultValue);
}

/**
 * 设置功能开关
 *
 * @param key 功能 key
 * @param value 开关值
 * @returns void
 * @remarks
 * 注意事项：会写入本地存储。
 * 潜在副作用：触发 localStorage 写入。
 */
export function setFeatureToggle(key: string, value: boolean): void {
  featureToggleStore.setEnabled(key, value);
}

/**
 * 记录 React 渲染次数
 *
 * @returns void
 * @remarks
 * 注意事项：用于性能面板统计。
 * 潜在副作用：无。
 */
export function markReactRender(): void {
  featureToggleStore.markReactRender();
}

/**
 * 获取 React 渲染次数
 *
 * @returns 渲染次数
 * @remarks
 * 注意事项：仅用于调试面板展示。
 * 潜在副作用：无。
 */
export function getReactRenderCount(): number {
  return featureToggleStore.reactRenderCount;
}
