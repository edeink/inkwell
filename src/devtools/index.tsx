import { lazy, Suspense, useEffect, useState } from 'react';

import { DevToolsLoading } from './components/loading';
import { DEVTOOLS_EVENTS } from './constants';
import { useDevtoolsHotkeys } from './hooks/useDevtoolsHotkeys';
import { usePanelStore } from './store';

import Runtime from '@/runtime';

// 懒加载重量级面板
const LazyDevToolsPanel = lazy(() =>
  // eslint-disable-next-line no-restricted-syntax
  import('./components/devtools-panel').then((module) => ({
    default: module.DevToolsPanel,
  })),
);

/**
 * Devtools 开发工具入口
 *
 * 全局单例组件，仅由 VitePress 主题加载一次。
 * 负责监听全局事件并管理面板显示/隐藏。
 */
export function DevTools() {
  const [visible, setVisible] = useState(false);

  const handleOpen = (e: Event) => {
    // 打开前重置 Store，确保状态纯净
    usePanelStore.getState().reset();

    const customEvent = e as CustomEvent;
    const instanceId = customEvent.detail?.instanceId;

    if (instanceId) {
      // 根据 instanceId 查找对应的 Runtime
      const entry = Runtime.canvasRegistry.get(instanceId);
      if (entry) {
        usePanelStore.getState().setRuntime(entry.runtime);
      }
    } else {
      // 如果没有指定 ID，尝试连接第一个可用的 Runtime
      const list = Array.from(Runtime.canvasRegistry.values());
      if (list.length > 0) {
        usePanelStore.getState().setRuntime(list[0].runtime);
      }
    }

    setVisible(true);
    usePanelStore.getState().setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
    usePanelStore.getState().setVisible(false);
    usePanelStore.getState().setRuntime(null);
  };

  const handleToggle = (e?: Event) => {
    if (visible) {
      handleClose();
    } else {
      handleOpen(e || new CustomEvent(DEVTOOLS_EVENTS.OPEN));
    }
  };

  // 快捷键支持 (仅在开发环境启用)
  useDevtoolsHotkeys({
    enabled: import.meta.env.DEV,
    onToggle: () => handleToggle(),
    onClose: handleClose,
  });

  useEffect(() => {
    // 绑定全局事件
    // 注意：这里不再在 Effect 中调用 reset()，避免 visible 变化时的循环重置
    window.addEventListener(DEVTOOLS_EVENTS.OPEN, handleOpen);
    window.addEventListener(DEVTOOLS_EVENTS.CLOSE, handleClose);

    return () => {
      window.removeEventListener(DEVTOOLS_EVENTS.OPEN, handleOpen);
      window.removeEventListener(DEVTOOLS_EVENTS.CLOSE, handleClose);
    };
  }, [visible]); // 依赖 visible 是因为 handleToggle 闭包需要最新状态? 不，handleToggle 是在此 effect 外定义的?
  // 注意：上面的 handleOpen/handleClose/handleToggle 定义在组件内，每次 render 都会重新创建。
  // useEffect 依赖 [visible]，所以每次 visible 变化，effect 重新运行，绑定新的 handler。
  // 这虽然有性能损耗，但对于 DevTools 这种低频操作是可以接受的，且保证了闭包状态正确。

  // 路由变化时自动关闭 DevTools
  useEffect(() => {
    const handleRouteChange = () => {
      setVisible(false);
      usePanelStore.getState().setVisible(false);
      usePanelStore.getState().setRuntime(null);
    };

    window.addEventListener('popstate', handleRouteChange);

    // 劫持 pushState 和 replaceState 以检测路由变化 (VitePress 使用 history API)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleRouteChange();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handleRouteChange();
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Suspense fallback={<DevToolsLoading />}>
      <LazyDevToolsPanel
        onClose={() => {
          window.dispatchEvent(new CustomEvent(DEVTOOLS_EVENTS.CLOSE));
        }}
      />
    </Suspense>
  );
}
