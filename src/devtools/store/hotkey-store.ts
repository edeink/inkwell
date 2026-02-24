/**
 * Devtools 快捷键状态模块
 *
 * 负责快捷键组合的持久化与更新。
 * 注意事项：每次更新都会写入本地存储。
 * 潜在副作用：触发 localStorage 写入。
 */
import { makeAutoObservable } from 'mobx';

import { DEVTOOLS_HOTKEY, DEVTOOLS_HOTKEY_DEFAULT } from '@/utils/local-storage';

/**
 * DevtoolsHotkeyStore
 *
 * 维护 Devtools 快捷键组合。
 * 注意事项：构造时读取本地存储的值。
 * 潜在副作用：更新时写入本地存储。
 */
export class DevtoolsHotkeyStore {
  combo: string;

  /**
   * 初始化快捷键状态
   *
   * @remarks
   * 注意事项：优先使用用户配置。
   * 潜在副作用：无。
   */
  constructor() {
    this.combo = DEVTOOLS_HOTKEY.get() ?? DEVTOOLS_HOTKEY_DEFAULT;
    makeAutoObservable(this);
  }

  /**
   * 更新快捷键组合
   *
   * @param next 新的快捷键组合
   * @remarks
   * 注意事项：应确保符合快捷键解析约定。
   * 潜在副作用：写入本地存储。
   */
  setCombo(next: string) {
    this.combo = next;
    DEVTOOLS_HOTKEY.set(next);
  }
}

/**
 * 全局唯一的快捷键 store 实例
 *
 * 注意事项：用于 Hook 读取当前快捷键配置。
 * 潜在副作用：无。
 */
export const devtoolsHotkeyStore = new DevtoolsHotkeyStore();
