/**
 * Devtools 面板内部视图
 *
 * 负责渲染布局容器、树面板、属性面板与 Overlay。
 * 注意事项：依赖 DevtoolsStoreProvider 提供的 RootStore。
 * 潜在副作用：注册页面可见性监听。
 */
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, type ReactElement } from 'react';

import { DEVTOOLS_DOM } from '../../../constants';
import { useMouseInteraction } from '../../../hooks/useMouseInteraction';
import { useDevtoolsStore } from '../../../store';
import LayoutPanel from '../../layout';
import Overlay from '../../overlay';
import { DevtoolsHeaderLeft } from '../header-left';
import { DevtoolsHeaderRight } from '../header-right';

import { ConfigProvider } from '@/ui';

/**
 * DevToolsPanelInner
 *
 * @param helpContent 帮助内容节点
 * @returns React 元素
 * @remarks
 * 注意事项：必须处于 DevtoolsStoreProvider 的上下文内。
 * 潜在副作用：注册页面可见性监听。
 */
export const DevToolsPanelInner = observer(function DevToolsPanelInner({
  helpContent,
}: {
  helpContent: ReactElement;
}) {
  const { panel } = useDevtoolsStore();
  const { runtime, activeInspect, visible } = panel;
  const inspectEnabled = panel.inspectEnabled;
  const { isMultiRuntime } = useMouseInteraction(panel, visible);
  const treeData = panel.treeData;
  const selectedNodeKey = panel.selectedNodeKey;
  const selected = panel.selectedWidget;
  const expandedKeys = useMemo<string[]>(
    () => Array.from(panel.expandedKeys),
    [panel.expandedKeys],
  );
  const breadcrumbs = panel.breadcrumbs;
  const overlayState = panel.overlayState;

  useEffect(() => panel.attachPageVisibility(), [panel]);

  return (
    <ConfigProvider
      getPopupContainer={(triggerNode) => {
        const container =
          (triggerNode?.closest?.(DEVTOOLS_DOM.ROOT_SELECTOR) as HTMLElement | null) ?? null;
        return container ?? document.body;
      }}
    >
      {overlayState.active ? (
        <Overlay runtime={runtime} active={overlayState.active} widget={overlayState.widget} />
      ) : null}
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
