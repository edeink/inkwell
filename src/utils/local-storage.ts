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

/**
 * 创建本地存储管理器
 * @param key 全局唯一的键名
 * @param defaultValue 默认值，当本地存储中不存在值时返回并写入本地
 * @throws 如果键名已存在，则抛出错误
 * @returns 本地存储管理器对象
 */
export function createLocalStorage<T>(key: string, defaultValue?: T): LocalStorageManager<T> {
  // 检查键名是否已存在
  if (keyRegistry.has(key)) {
    throw new Error(`LocalStorage key "${key}" already exists. Keys must be unique.`);
  }

  // 注册键名
  keyRegistry.add(key);

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

  return {
    get(): T | undefined {
      try {
        if (typeof localStorage === 'undefined') {
          return defaultValue;
        }

        const value = localStorage.getItem(key);

        if (value) {
          if (!isProbablyJson(value)) {
            try {
              localStorage.removeItem(key);
            } catch {}
            return defaultValue;
          }
          return JSON.parse(value) as T;
        } else if (defaultValue !== undefined) {
          // 如果本地存储中不存在值，但提供了默认值，则将默认值写入本地存储
          localStorage.setItem(key, JSON.stringify(defaultValue));
          return defaultValue;
        }

        return undefined;
      } catch (error) {
        try {
          localStorage.removeItem(key);
        } catch {}
        if (defaultValue !== undefined) {
          try {
            localStorage.setItem(key, JSON.stringify(defaultValue));
          } catch {}
          return defaultValue;
        }
        return undefined;
      }
    },

    set(value: T): void {
      try {
        if (typeof localStorage === 'undefined') {
          return;
        }
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`本地存储写入失败，key="${key}"`, error);
        throw new Error(`本地存储写入失败：${String(error)}`);
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

// 基准分辨率
export const LOCAL_RESOLUTION = createLocalStorage<number>('@edeink/editor/resolution', 4);
