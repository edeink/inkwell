/**
 * Devtools 根状态模块
 *
 * 聚合布局与面板状态，并提供调试工具接入能力。
 * 注意事项：应在外部销毁时调用 dispose 清理监听。
 * 潜在副作用：可能注入 MobX DevTools。
 */
import { getDevtoolsDebugConfig } from '../constants';

import { DevtoolsLayoutStore } from './layout-store';
import { DevtoolsPanelStore } from './panel-store';

/**
 * DevtoolsRootStore
 *
 * 统一管理布局与面板的状态实例。
 * 注意事项：只应创建一个实例并注入到上下文。
 * 潜在副作用：可能注册 MobX DevTools。
 */
export class DevtoolsRootStore {
  layout = new DevtoolsLayoutStore();
  panel = new DevtoolsPanelStore();

  /**
   * 挂载 MobX DevTools
   *
   * @returns Promise<void>
   * @remarks
   * 注意事项：仅在调试开关开启时执行。
   * 潜在副作用：向全局注入可视化调试对象。
   */
  async attachMobxDevtools() {
    const cfg = getDevtoolsDebugConfig();
    if (!cfg.enabled) {
      return;
    }
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
      }
      const globalWithDevtools = globalThis as typeof globalThis & {
        __INKWELL_MOBX_DEVTOOLS__?: (obj: unknown) => void;
      };
      const makeInspectable = globalWithDevtools.__INKWELL_MOBX_DEVTOOLS__;
      if (typeof makeInspectable === 'function') {
        makeInspectable(this);
      }
    } catch (err) {
      void err;
    }
  }

  /**
   * 释放根 store 资源
   *
   * @remarks
   * 注意事项：需确保面板的 reaction 已清理。
   * 潜在副作用：会清理面板监听器。
   */
  dispose() {
    this.panel.dispose();
  }
}
