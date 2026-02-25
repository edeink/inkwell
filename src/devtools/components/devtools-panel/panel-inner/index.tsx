/**
 * Devtools 面板内部视图
 *
 * 负责渲染布局容器、树面板、属性面板与 Overlay。
 * 注意事项：依赖 DevtoolsStoreProvider 提供的 RootStore。
 * 潜在副作用：注册页面可见性监听并输出调试日志。
 */
import { observer } from 'mobx-react-lite';
import { useEffect, type ReactElement } from 'react';

import {
  DEVTOOLS_DEBUG_LEVEL,
  DEVTOOLS_DOM,
  devtoolsGetMemorySnapshot,
  devtoolsGetResourceSnapshot,
  devtoolsLog,
  devtoolsLogEffect,
} from '../../../constants';
import { useMouseInteraction } from '../../../hooks/useMouseInteraction';
import { useDevtoolsStore } from '../../../store';
import LayoutPanel from '../../layout';
import { DevtoolsHeaderLeft } from '../header-left';
import { DevtoolsHeaderRight } from '../header-right';

import type { Widget } from '@/core/base';
import type Runtime from '@/runtime';
import type { DataNode } from '@/ui';

import { ConfigProvider } from '@/ui';

/**
 * DevToolsPanelInner
 *
 * @param helpContent 帮助内容节点
 * @returns React 元素
 * @remarks
 * 注意事项：必须处于 DevtoolsStoreProvider 的上下文内。
 * 潜在副作用：注册页面可见性监听与日志输出。
 */
export const DevToolsPanelInner = observer(function DevToolsPanelInner({
  helpContent,
}: {
  helpContent: ReactElement;
}) {
  const { panel } = useDevtoolsStore();
  const { activeInspect, visible } = panel;
  const isActive = visible || activeInspect;
  const inspectEnabled = panel.inspectEnabled;
  const { isMultiRuntime } = useMouseInteraction(panel, isActive);
  let runtime: Runtime | null = null;
  let treeData: DataNode[] = [];
  let selectedNodeKey: string | null = null;
  let selected: Widget | null = null;
  let expandedKeys: string[] = [];
  let breadcrumbs: Array<{ key: string; label: string }> = [];
  if (isActive) {
    runtime = panel.runtime;
    treeData = panel.treeData;
    selectedNodeKey = panel.selectedNodeKey;
    selected = panel.selectedWidget;
    expandedKeys = Array.from(panel.expandedKeys);
    breadcrumbs = panel.breadcrumbs;
  }

  useEffect(() => {
    devtoolsLogEffect('panel.mount', 'start');
    devtoolsLog(DEVTOOLS_DEBUG_LEVEL.INFO, 'DevToolsPanelInner 挂载', {
      内存: devtoolsGetMemorySnapshot(),
      资源: devtoolsGetResourceSnapshot(),
    });
    return () => {
      devtoolsLogEffect('panel.mount', 'cleanup');
      devtoolsLog(DEVTOOLS_DEBUG_LEVEL.INFO, 'DevToolsPanelInner 卸载', {
        内存: devtoolsGetMemorySnapshot(),
        资源: devtoolsGetResourceSnapshot(),
      });
    };
  }, []);

  useEffect(() => panel.attachPageVisibility(), [panel]);

  return (
    <ConfigProvider
      getPopupContainer={(triggerNode) => {
        const container =
          (triggerNode?.closest?.(DEVTOOLS_DOM.ROOT_SELECTOR) as HTMLElement | null) ?? null;
        return container ?? document.body;
      }}
    >
      {/* {overlayState.active ? (
        <Overlay runtime={runtime} active={overlayState.active} widget={overlayState.widget} />
      ) : null} */}
      <LayoutPanel
        visible={visible}
        headerLeft={
          <DevtoolsHeaderLeft
            activeInspect={activeInspect}
            disabled={!inspectEnabled}
            onToggleInspect={() => panel.toggleInspect()}
          />
        }
        headerRightExtra={(requestClose: () => void) => (
          <DevtoolsHeaderRight helpContent={helpContent} onRequestClose={requestClose} />
        )}
        onVisibleChange={(v: boolean) => {
          panel.setVisible(v);
        }}
        treePaneProps={{
          isMultiRuntime,
          treeData,
          expandedKeys,
          selectedKey: selectedNodeKey,
          breadcrumbs,
          onExpandKeysChange: (keys: string[]) => panel.setExpandedKeys(keys),
          onSelectKey: (key: string) => panel.handleSelectKey(key),
          onHoverKey: (key: string | null) => panel.handleHoverKey(key),
          onClickBreadcrumbKey: (key: string) => panel.handleClickBreadcrumbKey(key),
          onPrintSelected: () => panel.handlePrintSelected(),
        }}
        propsPaneProps={{
          widget: selected,
          onApply: () => runtime?.rebuild(),
        }}
      />
    </ConfigProvider>
  );
});
