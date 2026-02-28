/**
 * Devtools 主面板组件入口
 *
 * 负责创建 RootStore、挂载事件监听并渲染内部面板。
 * 注意事项：需运行在浏览器环境。
 * 潜在副作用：注册全局事件监听并创建 MobX store。
 */
import { useLayoutEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  DEVTOOLS_EVENTS,
  HOTKEY_ACTION,
  type HotkeyAction,
  isTypeObject,
  isTypeString,
} from '../../constants';
import { usePanelStore } from '../../store';

import { DevtoolsHelpContent } from './help-content';
import { DevToolsPanelInner } from './panel-inner';

import Runtime from '@/runtime';
import { DEVTOOLS_HOTKEY, DEVTOOLS_HOTKEY_DEFAULT } from '@/utils/local-storage';

/**
 * DevToolsPanel 组件属性
 *
 * 注意事项：shortcut 支持字符串或包含 action 的对象形式。
 * 潜在副作用：无。
 */
export interface DevToolsProps {
  onClose?: () => void;
  shortcut?: string | { combo: string; action?: HotkeyAction };
  defaultOpen?: boolean;
}

/**
 * DevToolsPanel
 *
 * @param props 面板属性
 * @returns React 元素或 null
 * @remarks
 * 注意事项：内部会创建 RootStore 并绑定全局事件。
 * 潜在副作用：注册 window 事件监听与创建 DevtoolsRootStore 实例。
 */
export const DevToolsPanel = function DevToolsPanel(props: DevToolsProps) {
  const { setVisible, setActiveInspect, toggleInspect, setRuntime } = usePanelStore(
    useShallow((state) => ({
      setVisible: state.setVisible,
      setActiveInspect: state.setActiveInspect,
      toggleInspect: state.toggleInspect,
      setRuntime: state.setRuntime,
    })),
  );

  const combo = useMemo(() => {
    const fromProps = isTypeString(props.shortcut)
      ? props.shortcut
      : isTypeObject(props.shortcut)
        ? (props.shortcut as { combo?: string }).combo
        : undefined;
    if (fromProps) {
      return fromProps;
    }
    return DEVTOOLS_HOTKEY.get() ?? DEVTOOLS_HOTKEY_DEFAULT;
  }, [props.shortcut]);

  const action = useMemo(() => {
    if (isTypeObject(props.shortcut) && (props.shortcut as { action?: string }).action) {
      return (props.shortcut as { action: HotkeyAction }).action;
    }
    return HOTKEY_ACTION.OPEN;
  }, [props.shortcut]);

  const helpContent = useMemo(
    () => <DevtoolsHelpContent combo={combo} action={action} />,
    [combo, action],
  );

  const tryAutoConnectRuntime = () => {
    // 只有当当前没有 Runtime 时才尝试自动连接
    const currentRuntime = usePanelStore.getState().runtime;
    if (!currentRuntime) {
      const list = Runtime.listCanvas();
      if (list.length > 0) {
        setRuntime(list[0].runtime);
      }
    }
  };

  useLayoutEffect(() => {
    // 仅在首次挂载且 defaultOpen 为 true 时打开，避免后续更新导致循环
    if (props.defaultOpen) {
      setVisible(true);
      tryAutoConnectRuntime();
    }

    // 监听 Runtime 注册变化，自动连接新出现的 Runtime
    const unsubscribe = Runtime.subscribeCanvasRegistryChange(() => {
      tryAutoConnectRuntime();
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const handleOpen = () => {
      setVisible(true);
      tryAutoConnectRuntime();
    };
    const handleClose = () => {
      setVisible(false);
      setActiveInspect(false);
    };
    const handleInspectToggle = () => {
      setVisible(true);
      tryAutoConnectRuntime();
      toggleInspect();
    };

    window.addEventListener(DEVTOOLS_EVENTS.OPEN, handleOpen);
    window.addEventListener(DEVTOOLS_EVENTS.CLOSE, handleClose);
    window.addEventListener(DEVTOOLS_EVENTS.INSPECT_TOGGLE, handleInspectToggle);
    return () => {
      window.removeEventListener(DEVTOOLS_EVENTS.OPEN, handleOpen);
      window.removeEventListener(DEVTOOLS_EVENTS.CLOSE, handleClose);
      window.removeEventListener(DEVTOOLS_EVENTS.INSPECT_TOGGLE, handleInspectToggle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <DevToolsPanelInner helpContent={helpContent} />;
};
