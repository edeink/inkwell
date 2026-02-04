import { throttle } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import Runtime from '../../../../runtime';
import {
  buildDevtoolsTree,
  computeRuntimeTreeHash,
  getNodeKeyByWidget,
  getPathNodeKeysByNodeKey,
} from '../../../helper/tree';
import { useMouseInteraction } from '../../../hooks/useMouseInteraction';
import LayoutPanel from '../../layout';
import Overlay, { type OverlayHandle } from '../../overlay';
import { DevtoolsHeaderLeft } from '../header-left';
import { DevtoolsHeaderRight } from '../header-right';
import { DevtoolsPropsPane } from '../props-pane';
import { DevtoolsTreePane, type AntTreeHandle } from '../tree-pane';

import type { Widget } from '@/core/base';

import { INKWELL_DEVTOOLS_INSPECT_ACTIVE } from '@/core/events/constants';
import { ConfigProvider, type DataNode } from '@/ui';

export function DevToolsPanelInner({
  activeInspect,
  visible,
  helpContent,
  setActiveInspect,
  setVisible,
}: {
  activeInspect: boolean;
  visible: boolean;
  helpContent: ReactElement;
  setActiveInspect: (next: boolean | ((prev: boolean) => boolean)) => void;
  setVisible: (next: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const hoverRef = useRef<Widget | null>(null);
  const treeRef = useRef<AntTreeHandle | null>(null);
  const overlayRef = useRef<OverlayHandle | null>(null);

  const [version, setVersion] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const lastTreeHashRef = useRef<number>(0);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    (globalThis as unknown as Record<string, unknown>)[INKWELL_DEVTOOLS_INSPECT_ACTIVE] =
      activeInspect;
    return () => {
      (globalThis as unknown as Record<string, unknown>)[INKWELL_DEVTOOLS_INSPECT_ACTIVE] = false;
    };
  }, [activeInspect]);

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

  const treeBuild = useMemo(() => {
    void version;
    if (!runtime) {
      return buildDevtoolsTree(null, null);
    }
    return buildDevtoolsTree(
      runtime?.getRootWidget?.() ?? null,
      runtime?.getOverlayRootWidget?.() ?? null,
    );
  }, [runtime, version]);
  const treeData = useMemo(() => treeBuild.treeData as DataNode[], [treeBuild]);
  const treeBuildRef = useRef(treeBuild);
  useEffect(() => {
    treeBuildRef.current = treeBuild;
  }, [treeBuild]);
  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  useEffect(() => {
    setSelectedNodeKey(null);
    setExpandedKeys(new Set());
    hoverRef.current = null;
    overlayRef.current?.setActive(false);
    overlayRef.current?.highlight(null);
  }, [runtime]);

  const selected = useMemo(() => {
    if (!selectedNodeKey) {
      return null;
    }
    return treeBuild.widgetByNodeKey.get(selectedNodeKey) ?? null;
  }, [selectedNodeKey, treeBuild]);

  // 监听 runtime 变化，更新树结构
  useEffect(() => {
    if (!runtime) {
      return;
    }

    const shouldUpdate = visible && isPageVisible;
    if (!shouldUpdate) {
      return;
    }

    lastTreeHashRef.current = computeRuntimeTreeHash(runtime);
    setVersion((v) => v + 1);
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let idleId: number | null = null;
    const run = () => {
      idleId = null;
      const nextHash = computeRuntimeTreeHash(runtime);
      if (nextHash === lastTreeHashRef.current) {
        return;
      }
      lastTreeHashRef.current = nextHash;
      setVersion((v) => v + 1);
    };
    const schedule = () => {
      if (idleId != null) {
        return;
      }
      if (w.requestIdleCallback) {
        idleId = w.requestIdleCallback(run, { timeout: 800 });
      } else {
        idleId = window.setTimeout(run, 0);
      }
    };
    const update = throttle(schedule, 250, { trailing: true });

    const dispose = runtime.addTickListener(update);
    return () => {
      dispose();
      update.cancel();
      if (idleId != null) {
        if (w.cancelIdleCallback) {
          w.cancelIdleCallback(idleId);
        } else {
          window.clearTimeout(idleId);
        }
        idleId = null;
      }
    };
  }, [runtime, visible, isPageVisible]);

  const breadcrumbs = useMemo(() => {
    if (!selectedNodeKey) {
      return [];
    }
    const keys = getPathNodeKeysByNodeKey(selectedNodeKey);
    return keys.map((k) => {
      const w = treeBuild.widgetByNodeKey.get(k) ?? null;
      return { key: k, label: w ? w.type : k };
    });
  }, [selectedNodeKey, treeBuild]);

  const getHoverRef = useCallback(() => hoverRef.current, []);
  const setHoverRef = useCallback((w: Widget | null) => {
    hoverRef.current = w;
  }, []);
  const setRuntimeStable = useCallback((rt: Runtime) => setRuntime(rt), []);

  const scrollToKey = useCallback((k: string) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-key="${k}"]`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      } else if (treeRef.current?.scrollTo) {
        treeRef.current.scrollTo({ key: k, align: 'auto' });
      }
    });
  }, []);

  const onPick = useCallback(
    (current: Widget) => {
      const rt = runtimeRef.current;
      const tree = treeBuildRef.current;
      const nodeKey =
        tree.nodeKeyByWidget.get(current) ?? (rt ? getNodeKeyByWidget(rt, current) : null);
      if (!nodeKey) {
        setSelectedNodeKey(null);
        return;
      }
      setSelectedNodeKey(nodeKey);
      setExpandedKeys(new Set(getPathNodeKeysByNodeKey(nodeKey)));
      scrollToKey(nodeKey);
      setActiveInspect(false);
    },
    [scrollToKey, setActiveInspect],
  );

  const { isMultiRuntime } = useMouseInteraction({
    runtime,
    overlayRef,
    active: activeInspect,
    getHoverRef,
    setHoverRef,
    setRuntime: setRuntimeStable,
    onPick,
  });

  const handleHoverKey = (k: string | null) => {
    if (!k) {
      overlayRef.current?.setActive(false);
      overlayRef.current?.highlight(null);
      return;
    }
    const w = treeBuild.widgetByNodeKey.get(k) ?? null;
    hoverRef.current = w;
    overlayRef.current?.setActive(!!w);
    overlayRef.current?.highlight(w);
  };

  const handleSelectKey = (k: string) => {
    const w = treeBuild.widgetByNodeKey.get(k) ?? null;
    setSelectedNodeKey(w ? k : null);
    if (w) {
      setExpandedKeys(new Set(getPathNodeKeysByNodeKey(k)));
    }
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
      <Overlay ref={overlayRef} runtime={runtime} />
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
        onVisibleChange={(v) => {
          setVisible(v);
          if (!v) {
            setActiveInspect(false);
          }
        }}
        renderTree={(info) => (
          <DevtoolsTreePane
            info={info}
            treeRef={treeRef}
            isMultiRuntime={isMultiRuntime}
            treeData={treeData}
            expandedKeys={Array.from(expandedKeys)}
            selectedKey={selectedNodeKey}
            breadcrumbs={breadcrumbs}
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
