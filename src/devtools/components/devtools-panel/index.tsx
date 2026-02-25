/**
 * Devtools 主面板组件入口
 *
 * 负责创建 RootStore、挂载事件监听并渲染内部面板。
 * 注意事项：需运行在浏览器环境。
 * 潜在副作用：注册全局事件监听并创建 MobX store。
 */
import { observer } from 'mobx-react-lite';
import { useEffect, useLayoutEffect, useMemo } from 'react';

import {
  DEVTOOLS_DEBUG_LEVEL,
  DEVTOOLS_EVENTS,
  HOTKEY_ACTION,
  type HotkeyAction,
  devtoolsCount,
  devtoolsGetMemorySnapshot,
  devtoolsGetResourceSnapshot,
  devtoolsLog,
  devtoolsLogEffect,
  devtoolsTrackEventListener,
  isTypeObject,
  isTypeString,
} from '../../constants';
import { DevtoolsRootStore, DevtoolsStoreProvider } from '../../store';

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
export const DevToolsPanel = observer(function DevToolsPanel(props: DevToolsProps) {
  const store = useMemo(() => new DevtoolsRootStore(), []);
  const { panel } = store;

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

  useEffect(() => {
    void store.attachMobxDevtools();
    return () => store.dispose();
  }, [store]);

  useLayoutEffect(() => {
    devtoolsLogEffect('panel.listener', 'start');
    devtoolsLog(DEVTOOLS_DEBUG_LEVEL.INFO, 'DevToolsPanel 挂载', {
      内存: devtoolsGetMemorySnapshot(),
      资源: devtoolsGetResourceSnapshot(),
    });
    const handleOpen = () => panel.setVisible(true);
    const handleClose = () => {
      panel.setVisible(false);
      panel.setActiveInspect(false);
    };
    const handleInspectToggle = () => {
      panel.setVisible(true);
      panel.toggleInspect();
    };

    window.addEventListener(DEVTOOLS_EVENTS.OPEN, handleOpen);
    devtoolsTrackEventListener('add', DEVTOOLS_EVENTS.OPEN, 'window');
    window.addEventListener(DEVTOOLS_EVENTS.CLOSE, handleClose);
    devtoolsTrackEventListener('add', DEVTOOLS_EVENTS.CLOSE, 'window');
    window.addEventListener(DEVTOOLS_EVENTS.INSPECT_TOGGLE, handleInspectToggle);
    devtoolsTrackEventListener('add', DEVTOOLS_EVENTS.INSPECT_TOGGLE, 'window');
    return () => {
      devtoolsLogEffect('panel.listener', 'cleanup');
      window.removeEventListener(DEVTOOLS_EVENTS.OPEN, handleOpen);
      devtoolsTrackEventListener('remove', DEVTOOLS_EVENTS.OPEN, 'window');
      window.removeEventListener(DEVTOOLS_EVENTS.CLOSE, handleClose);
      devtoolsTrackEventListener('remove', DEVTOOLS_EVENTS.CLOSE, 'window');
      window.removeEventListener(DEVTOOLS_EVENTS.INSPECT_TOGGLE, handleInspectToggle);
      devtoolsTrackEventListener('remove', DEVTOOLS_EVENTS.INSPECT_TOGGLE, 'window');
      devtoolsLog(DEVTOOLS_DEBUG_LEVEL.INFO, 'DevToolsPanel 卸载', {
        内存: devtoolsGetMemorySnapshot(),
        资源: devtoolsGetResourceSnapshot(),
      });
    };
  }, [panel]);

  useLayoutEffect(() => {
    devtoolsLogEffect('panel.state', 'start', { 可见: panel.visible, 拾取: panel.activeInspect });
    devtoolsLog(DEVTOOLS_DEBUG_LEVEL.INFO, 'DevToolsPanel 状态更新', {
      可见: panel.visible,
      拾取: panel.activeInspect,
    });
    devtoolsCount('DevToolsPanel.stateChange', { threshold: 6, windowMs: 1000 });
  }, [panel.activeInspect, panel.visible]);

  return (
    <DevtoolsStoreProvider store={store}>
      <DevToolsPanelInner helpContent={helpContent} />
    </DevtoolsStoreProvider>
  );
});
