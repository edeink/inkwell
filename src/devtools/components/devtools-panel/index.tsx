import { ConfigProvider } from 'antd';
import { throttle } from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';

import Runtime from '../../../runtime';
import { getPathKeys, toAntTreeData, toTree } from '../../helper/tree';
import { useDevtoolsHotkeys } from '../../hooks/useDevtoolsHotkeys';
import { useMouseInteraction } from '../../hooks/useMouseInteraction';
import LayoutPanel from '../layout';
import Overlay from '../overlay';

import { DevtoolsHeaderLeft } from './header-left';
import { DevtoolsHeaderRight } from './header-right';
import { DevtoolsHelpContent } from './help-content';
import { DevtoolsPropsPane } from './props-pane';
import { DevtoolsTreePane, type AntTreeHandle } from './tree-pane';

import type { Widget } from '@/core/base';
import type { DataNode } from 'antd/es/tree';

import { findWidget } from '@/core/helper/widget-selector';

export interface DevToolsProps {
  onClose?: () => void;
  shortcut?: string | { combo: string; action?: 'toggle' | 'inspect' };
}

export function DevToolsPanel(props: DevToolsProps) {
  const [selected, setSelected] = useState<Widget | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const hoverRef = useRef<Widget | null>(null);
  const treeRef = useRef<AntTreeHandle | null>(null);

  const [version, setVersion] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    setIsPageVisible(!document.hidden);
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const tree = useMemo(() => {
    void version;
    return toTree(runtime?.getRootWidget?.() ?? null);
  }, [runtime, version]);
  const treeData = useMemo(() => toAntTreeData(tree) as DataNode[], [tree]);

  const overlay = useMemo(() => (runtime ? new Overlay(runtime) : null), [runtime]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [activeInspect, setActiveInspect] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);

  const { combo } = useDevtoolsHotkeys({
    combo:
      typeof props.shortcut === 'string'
        ? props.shortcut
        : props.shortcut?.combo || 'CmdOrCtrl+Shift+D',
    action:
      typeof props.shortcut === 'object' && props.shortcut?.action
        ? props.shortcut.action
        : 'toggle',
    onToggle: () => setVisible((v) => !v),
    onInspectToggle: () => setActiveInspect((v) => !v),
  });

  const helpContent = useMemo(() => <DevtoolsHelpContent combo={combo} />, [combo]);

  useEffect(() => {
    if (!runtime) {
      return;
    }

    const shouldUpdate = visible && isPageVisible;
    if (!shouldUpdate) {
      return;
    }

    setVersion((v) => v + 1);
    const update = throttle(
      () => {
        setVersion((v) => v + 1);
      },
      300,
      { trailing: true },
    );

    const dispose = runtime.addTickListener(update);
    return () => {
      dispose();
      update.cancel();
    };
  }, [runtime, visible, isPageVisible]);

  const breadcrumbs = useMemo(() => {
    if (!selected) {
      return [];
    }
    const list: Widget[] = [];
    let current: Widget | null = selected;
    while (current) {
      list.unshift(current);
      current = current.parent;
    }
    return list;
  }, [selected]);

  const { isMultiRuntime } = useMouseInteraction({
    runtime,
    overlay,
    active: activeInspect,
    getHoverRef: () => hoverRef.current,
    setHoverRef: (w) => {
      hoverRef.current = w;
    },
    setRuntime: (rt) => setRuntime(rt),
    onPick: (current) => {
      setSelected(current);
      setVersion((v) => v + 1);
      const path = getPathKeys(runtime?.getRootWidget?.() ?? null, current.key);
      setExpandedKeys(new Set(path));
      setActiveInspect(false);
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-key="${current.key}"]`);
        if (el) {
          el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        } else if (treeRef.current?.scrollTo) {
          treeRef.current.scrollTo({ key: current.key, align: 'auto' });
        }
      });
    },
  });

  const handleHoverKey = (k: string | null) => {
    if (!overlay) {
      return;
    }
    if (!k) {
      overlay.setActive(false);
      overlay.highlight(null);
      return;
    }
    const w = findWidget(runtime?.getRootWidget?.() ?? null, `#${k}`) as Widget | null;
    hoverRef.current = w;
    overlay.setActive(true);
    overlay.highlight(w);
  };

  const handleSelectKey = (k: string) => {
    const w = findWidget(runtime?.getRootWidget?.() ?? null, `#${k}`) as Widget | null;
    setSelected(w);
    if (w) {
      const path = getPathKeys(runtime?.getRootWidget?.() ?? null, k);
      setExpandedKeys(new Set(path));
    }
  };

  const scrollToKey = (k: string) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-key="${k}"]`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      } else if (treeRef.current?.scrollTo) {
        treeRef.current.scrollTo({ key: k, align: 'auto' });
      }
    });
  };

  const handleClickBreadcrumbKey = (k: string) => {
    handleSelectKey(k);
    scrollToKey(k);
  };

  const handlePrintSelected = () => {
    if (!selected) {
      console.log('未选中节点');
      return;
    }
    console.log(selected);
  };

  return (
    <ConfigProvider
      getPopupContainer={(triggerNode) => {
        const container =
          (triggerNode?.closest?.('#inkwell-devtools-root') as HTMLElement | null) ?? null;
        return container ?? document.body;
      }}
    >
      <LayoutPanel
        visible={visible}
        headerLeft={
          <DevtoolsHeaderLeft
            activeInspect={activeInspect}
            onToggleInspect={() => setActiveInspect((v) => !v)}
          />
        }
        headerRightExtra={(requestClose) => (
          <DevtoolsHeaderRight helpContent={helpContent} onRequestClose={requestClose} />
        )}
        onVisibleChange={setVisible}
        renderTree={(info) => (
          <DevtoolsTreePane
            info={info}
            treeRef={treeRef}
            isMultiRuntime={isMultiRuntime}
            treeData={treeData}
            expandedKeys={Array.from(expandedKeys)}
            selectedKey={selected?.key ?? null}
            breadcrumbs={breadcrumbs.map((w) => ({ key: w.key, label: w.type }))}
            onExpandKeysChange={(keys) => setExpandedKeys(new Set(keys))}
            onSelectKey={handleSelectKey}
            onHoverKey={handleHoverKey}
            onClickBreadcrumbKey={handleClickBreadcrumbKey}
            onPrintSelected={handlePrintSelected}
          />
        )}
        renderProps={() => (
          <DevtoolsPropsPane widget={selected} onApply={() => runtime?.rebuild()} />
        )}
      />
    </ConfigProvider>
  );
}
