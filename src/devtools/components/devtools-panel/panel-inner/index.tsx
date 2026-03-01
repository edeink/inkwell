/**
 * Devtools 面板内部视图
 *
 * 负责渲染布局容器、树面板、属性面板与 Overlay。
 * 注意事项：依赖 DevtoolsStoreProvider 提供的 RootStore。
 * 潜在副作用：注册页面可见性监听。
 */
import { type ReactElement, useLayoutEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useDevToolsInteraction } from '../../../hooks/useDevToolsInteraction';
import { useDevToolsMonitor } from '../../../hooks/useDevToolsMonitor';
import { usePanelStore } from '../../../store';
import LayoutPanel from '../../layout';
import Overlay from '../../overlay';
import { DevtoolsHeaderLeft } from '../header-left';
import { DevtoolsHeaderRight } from '../header-right';
import { DevtoolsPropsPane } from '../props-pane';
import { DevtoolsTreePane } from '../tree-pane';

/**
 * DevToolsPanelInner
 *
 * @param helpContent 帮助内容节点
 * @returns React 元素
 * @remarks
 * 注意事项：必须处于 DevtoolsStoreProvider 的上下文内。
 * 潜在副作用：注册页面可见性监听。
 */
export const DevToolsPanelInner = function DevToolsPanelInner({
  helpContent,
}: {
  helpContent: ReactElement;
}) {
  // 渲染调试日志
  console.log('[DevToolsPanelInner] 渲染');
  useLayoutEffect(() => {
    console.log('[DevToolsPanelInner] 挂载');
    return () => console.log('[DevToolsPanelInner] 卸载');
  }, []);

  useDevToolsMonitor();
  useDevToolsInteraction();

  const { visible, setVisible } = usePanelStore(
    useShallow((state) => ({
      visible: state.visible,
      setVisible: state.setVisible,
    })),
  );

  return (
    <>
      <Overlay />
      <LayoutPanel
        visible={visible}
        headerLeft={<DevtoolsHeaderLeft />}
        headerRightExtra={(requestClose: () => void) => (
          <DevtoolsHeaderRight helpContent={helpContent} onRequestClose={requestClose} />
        )}
        onVisibleChange={(v: boolean) => {
          setVisible(v);
        }}
        treePane={<DevtoolsTreePane />}
        propsPane={<DevtoolsPropsPane />}
      />
    </>
  );
};
