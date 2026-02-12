/**
 * 本地存储工具类
 * 提供对浏览器 localStorage 的封装，确保 key 的唯一性
 */

// 存储的键名注册表，用于检查唯一性
const keyRegistry: Set<string> = new Set();

/**
 * 本地存储管理器接口
 */
export interface LocalStorageManager<T> {
  /**
   * 获取存储的值
   * @returns 存储的值，如果不存在则返回默认值或 undefined
   */
  get(): T | undefined;

  /**
   * 设置存储的值
   * @param value 要存储的值
   */
  set(value: T): void;

  /**
   * 清除存储的值
   */
  clear(): void;
}

type StorageCodec = 'json' | 'string';
type StorageOptions = { codec?: StorageCodec };
type DefaultValue<T> = T | (() => T);

/**
 * 创建本地存储管理器
 * @param key 全局唯一的键名
 * @param defaultValue 默认值，当本地存储中不存在值时返回并写入本地
 * @throws 如果键名已存在，则抛出错误
 * @returns 本地存储管理器对象
 */
export function createLocalStorage<T>(
  key: string,
  defaultValue?: DefaultValue<T>,
  options?: StorageOptions,
): LocalStorageManager<T> {
  // 检查键名是否已存在
  if (keyRegistry.has(key)) {
    throw new Error(`LocalStorage key "${key}" already exists. Keys must be unique.`);
  }

  // 注册键名
  keyRegistry.add(key);

  const codec: StorageCodec = options?.codec ?? 'json';
  const hasDefault = defaultValue !== undefined;
  const resolveDefault = (): T | undefined =>
    hasDefault
      ? ((typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue) as T)
      : undefined;

  function isProbablyJson(raw: string): boolean {
    const s = raw.trim();
    if (!s) {
      return false;
    }
    const ch = s.charCodeAt(0);
    if (ch === 0x7b || ch === 0x5b || ch === 0x22) {
      return true;
    }
    if (ch === 0x2d || (ch >= 0x30 && ch <= 0x39)) {
      return true;
    }
    return s === 'true' || s === 'false' || s === 'null';
  }

  function maybeDecodeJsonString(raw: string): string | undefined {
    const s = raw.trim();
    if (!s || s.charCodeAt(0) !== 0x22) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(s);
      return typeof parsed === 'string' ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  function writeDefault(next: T): void {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      if (codec === 'string') {
        localStorage.setItem(key, String(next));
        return;
      }
      localStorage.setItem(key, JSON.stringify(next));
    } catch (error) {
      console.warn(`本地存储写入失败，key="${key}"`, error);
    }
  }

  return {
    get(): T | undefined {
      try {
        if (typeof localStorage === 'undefined') {
          return resolveDefault();
        }

        const value = localStorage.getItem(key);

        if (value != null) {
          if (codec === 'string') {
            const decoded = maybeDecodeJsonString(value);
            return (decoded ?? value) as unknown as T;
          }
          if (!isProbablyJson(value)) {
            try {
              localStorage.removeItem(key);
            } catch {
              void 0;
            }
            const nextDefault = resolveDefault();
            if (nextDefault !== undefined) {
              writeDefault(nextDefault);
            }
            return nextDefault;
          }
          return JSON.parse(value) as T;
        }

        const nextDefault = resolveDefault();
        if (nextDefault !== undefined) {
          writeDefault(nextDefault);
          return nextDefault;
        }

        return undefined;
      } catch (error) {
        console.warn(`本地存储读取失败，key="${key}"`, error);
        try {
          localStorage.removeItem(key);
        } catch {
          void 0;
        }
        const nextDefault = resolveDefault();
        if (nextDefault !== undefined) {
          writeDefault(nextDefault);
          return nextDefault;
        }
        return undefined;
      }
    },

    set(value: T): void {
      try {
        if (typeof localStorage === 'undefined') {
          return;
        }
        if (codec === 'string') {
          localStorage.setItem(key, String(value));
          return;
        }
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn(`本地存储写入失败，key="${key}"`, error);
      }
    },

    clear(): void {
      try {
        if (typeof localStorage === 'undefined') {
          return;
        }
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`本地存储清理失败，key="${key}"`, error);
      }
    },
  };
}

export type DevtoolsDock = 'left' | 'right' | 'top' | 'bottom';
export type DevtoolsLayoutStorage = { dock: DevtoolsDock; width: number; height: number };
export type DevtoolsSplitStorage = { treeWidth: number; treeHeight: number };

export function getDevtoolsDefaultLayout(): DevtoolsLayoutStorage {
  const safeHeight =
    typeof window !== 'undefined' && Number.isFinite(window.innerHeight)
      ? Math.min(window.innerHeight, 420)
      : 420;
  return { dock: 'right', width: 380, height: safeHeight };
}

export const DEVTOOLS_HOTKEY_DEFAULT = 'CmdOrCtrl+Shift+D';
export const DEVTOOLS_HOTKEY = createLocalStorage<string>(
  'INKWELL_DEVTOOLS_HOTKEY',
  DEVTOOLS_HOTKEY_DEFAULT,
  { codec: 'string' },
);
export const DEVTOOLS_LAYOUT = createLocalStorage<DevtoolsLayoutStorage>(
  'INKWELL_DEVTOOLS_LAYOUT',
  getDevtoolsDefaultLayout,
);
export const DEVTOOLS_SPLIT_DEFAULT: DevtoolsSplitStorage = { treeWidth: 300, treeHeight: 240 };
export const DEVTOOLS_SPLIT = createLocalStorage<DevtoolsSplitStorage>(
  'INKWELL_DEVTOOLS_SPLIT',
  DEVTOOLS_SPLIT_DEFAULT,
);
export const DEVTOOLS_MOUNT_FAIL = createLocalStorage<string>(
  'INKWELL_DEVTOOLS_MOUNT_FAIL',
  undefined,
  { codec: 'string' },
);

export const RESUME_UNLOCKED = createLocalStorage<string>('inkwell_resume_unlocked', undefined, {
  codec: 'string',
});

// 基准分辨率
export const LOCAL_RESOLUTION = createLocalStorage<number>('@edeink/editor/resolution', 4);
