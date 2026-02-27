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
  const { setVisible, setActiveInspect, toggleInspect } = usePanelStore(
    useShallow((state) => ({
      setVisible: state.setVisible,
      setActiveInspect: state.setActiveInspect,
      toggleInspect: state.toggleInspect,
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

  useLayoutEffect(() => {
    const handleOpen = () => setVisible(true);
    const handleClose = () => {
      setVisible(false);
      setActiveInspect(false);
    };
    const handleInspectToggle = () => {
      setVisible(true);
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
  }, [setVisible, setActiveInspect, toggleInspect]);

  return <DevToolsPanelInner helpContent={helpContent} />;
};
