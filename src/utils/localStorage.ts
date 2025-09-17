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
export function createLocalStorage<T>(
  key: string,
  defaultValue?: T
): LocalStorageManager<T> {
  // 检查键名是否已存在
  if (keyRegistry.has(key)) {
    throw new Error(
      `LocalStorage key "${key}" already exists. Keys must be unique.`
    );
  }

  // 注册键名
  keyRegistry.add(key);

  return {
    get(): T | undefined {
      try {
        const value = localStorage.getItem(key);

        if (value) {
          return JSON.parse(value) as T;
        } else if (defaultValue !== undefined) {
          // 如果本地存储中不存在值，但提供了默认值，则将默认值写入本地存储
          localStorage.setItem(key, JSON.stringify(defaultValue));
          return defaultValue;
        }

        return undefined;
      } catch (error) {
        console.error(`Error getting value for key "${key}":`, error);
        return defaultValue !== undefined ? defaultValue : undefined;
      }
    },

    set(value: T): void {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error setting value for key "${key}":`, error);
        throw new Error(`Failed to save data to localStorage: ${error}`);
      }
    },

    clear(): void {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Error clearing value for key "${key}":`, error);
      }
    },
  };
}

// 基准分辨率
export const LOCAL_RESOLUTION = createLocalStorage<number>(
  "@edeink/editor/resolution",
  4
);
