/**
 * Devtools Store React 上下文模块
 *
 * 负责向组件树提供 RootStore 实例与读取入口。
 * 注意事项：使用前必须在 Provider 中注入 store。
 * 潜在副作用：未提供 store 时会抛出错误。
 */
import React, { createContext, useContext } from 'react';

import type { DevtoolsRootStore } from './root-store';

const DevtoolsStoreContext = createContext<DevtoolsRootStore | null>(null);

/**
 * DevtoolsStoreProvider
 *
 * 向 React 组件树提供 DevtoolsRootStore。
 *
 * @param props.store RootStore 实例
 * @param props.children 子组件
 * @returns Provider 元素
 * @remarks
 * 注意事项：必须包裹使用 useDevtoolsStore 的组件。
 * 潜在副作用：无。
 */
export function DevtoolsStoreProvider({
  store,
  children,
}: {
  store: DevtoolsRootStore;
  children: React.ReactNode;
}) {
  return React.createElement(DevtoolsStoreContext.Provider, { value: store }, children);
}

/**
 * useDevtoolsStore
 *
 * 获取当前上下文中的 RootStore。
 *
 * @returns RootStore 实例
 * @remarks
 * 注意事项：未包裹 Provider 时会抛出错误。
 * 潜在副作用：无。
 */
export function useDevtoolsStore() {
  const store = useContext(DevtoolsStoreContext);
  if (!store) {
    throw new Error('DevtoolsStore 未初始化');
  }
  return store;
}
