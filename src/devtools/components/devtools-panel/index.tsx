import { throttle } from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';

import Runtime from '../../../runtime';
import { buildDevtoolsTree, getPathNodeKeys } from '../../helper/tree';
import { useDevtoolsHotkeys } from '../../hooks/useDevtoolsHotkeys';
import { useMouseInteraction } from '../../hooks/useMouseInteraction';
import LayoutPanel from '../layout';
import Overlay, { type OverlayHandle } from '../overlay';

import { DevtoolsHeaderLeft } from './header-left';
import { DevtoolsHeaderRight } from './header-right';
import { DevtoolsHelpContent } from './help-content';
import { DevtoolsPropsPane } from './props-pane';
import { DevtoolsTreePane, type AntTreeHandle } from './tree-pane';

import type { Widget } from '@/core/base';

import { ConfigProvider, type DataNode } from '@/ui';

const objIdByRef = new WeakMap<object, number>();
let objIdSeq = 1;

function getObjId(v: unknown): number {
  if (!v || (typeof v !== 'object' && typeof v !== 'function')) {
    return 0;
  }
  const obj = v as object;
  const existed = objIdByRef.get(obj);
  if (existed != null) {
    return existed;
  }
  const next = objIdSeq++;
  objIdByRef.set(obj, next);
  return next;
}

function hashStr(h: number, s: string): number {
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h;
}

function hashNum(h: number, n: number): number {
  h ^= n >>> 0;
  return Math.imul(h, 16777619);
}

function computeWidgetTreeHash(root: Widget | null): number {
  if (!root) {
    return 0;
  }
  let h = 2166136261;
  const stack: Widget[] = [root];
  while (stack.length) {
    const w = stack.pop()!;
    h = hashStr(h, w.key ?? '');
    h = hashStr(h, w.type ?? '');
    h = hashNum(h, getObjId((w as unknown as { data?: unknown }).data));
    const children = w.children ?? [];
    h = hashNum(h, children.length);
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }
  return h >>> 0;
}

function computeRuntimeTreeHash(runtime: Runtime): number {
  const rootHash = computeWidgetTreeHash(runtime.getRootWidget?.() ?? null);
  const overlayHash = computeWidgetTreeHash(runtime.getOverlayRootWidget?.() ?? null);
  return hashNum(rootHash, overlayHash);
}

export interface DevToolsProps {
  onClose?: () => void;
  shortcut?: string | { combo: string; action?: 'toggle' | 'inspect' };
}

export function DevToolsPanel(props: DevToolsProps) {
  const [selected, setSelected] = useState<Widget | null>(null);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const hoverRef = useRef<Widget | null>(null);
  const treeRef = useRef<AntTreeHandle | null>(null);
  const overlayRef = useRef<OverlayHandle | null>(null);

  const [version, setVersion] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const lastTreeHashRef = useRef<number>(0);

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
    return buildDevtoolsTree(
      runtime?.getRootWidget?.() ?? null,
      runtime?.getOverlayRootWidget?.() ?? null,
    );
  }, [runtime, version]);
  const treeData = useMemo(() => treeBuild.treeData as DataNode[], [treeBuild]);

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [activeInspect, setActiveInspect] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    setSelected(null);
    setSelectedNodeKey(null);
    setExpandedKeys(new Set());
    hoverRef.current = null;
    overlayRef.current?.setActive(false);
    overlayRef.current?.highlight(null);
  }, [runtime]);

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
    const handleToggle = () => setVisible((v) => !v);
    const handleOpen = () => setVisible(true);
    const handleClose = () => {
      setVisible(false);
      setActiveInspect(false);
    };
    const handleInspectToggle = () => {
      setVisible(true);
      setActiveInspect((v) => !v);
    };

    window.addEventListener('INKWELL_DEVTOOLS_TOGGLE', handleToggle);
    window.addEventListener('INKWELL_DEVTOOLS_OPEN', handleOpen);
    window.addEventListener('INKWELL_DEVTOOLS_CLOSE', handleClose);
    window.addEventListener('INKWELL_DEVTOOLS_INSPECT_TOGGLE', handleInspectToggle);
    return () => {
      window.removeEventListener('INKWELL_DEVTOOLS_TOGGLE', handleToggle);
      window.removeEventListener('INKWELL_DEVTOOLS_OPEN', handleOpen);
      window.removeEventListener('INKWELL_DEVTOOLS_CLOSE', handleClose);
      window.removeEventListener('INKWELL_DEVTOOLS_INSPECT_TOGGLE', handleInspectToggle);
    };
  }, []);

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
    const update = throttle(
      () => {
        const nextHash = computeRuntimeTreeHash(runtime);
        if (nextHash === lastTreeHashRef.current) {
          return;
        }
        lastTreeHashRef.current = nextHash;
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
    overlayRef,
    active: activeInspect,
    getHoverRef: () => hoverRef.current,
    setHoverRef: (w) => {
      hoverRef.current = w;
    },
    setRuntime: (rt) => setRuntime(rt),
    onPick: (current) => {
      setSelected(current);
      setVersion((v) => v + 1);
      let nodeKey = treeBuild.nodeKeyByWidget.get(current) ?? null;
      if (!nodeKey) {
        let p: Widget | null = current.parent;
        while (p && !nodeKey) {
          nodeKey = treeBuild.nodeKeyByWidget.get(p) ?? null;
          p = p.parent;
        }
      }
      if (nodeKey) {
        setSelectedNodeKey(nodeKey);
        setExpandedKeys(new Set(getPathNodeKeys(treeBuild.parentByNodeKey, nodeKey)));
      }
      setActiveInspect(false);
      if (nodeKey) {
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-key="${nodeKey}"]`);
          if (el) {
            el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          } else if (treeRef.current?.scrollTo) {
            treeRef.current.scrollTo({ key: nodeKey, align: 'auto' });
          }
        });
      }
    },
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
    setSelected(w);
    setSelectedNodeKey(w ? k : null);
    if (w) {
      setExpandedKeys(new Set(getPathNodeKeys(treeBuild.parentByNodeKey, k)));
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

  // 打印选中节点（调试用）
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
        onVisibleChange={setVisible}
        renderTree={(info) => (
          <DevtoolsTreePane
            info={info}
            treeRef={treeRef}
            isMultiRuntime={isMultiRuntime}
            treeData={treeData}
            expandedKeys={Array.from(expandedKeys)}
            selectedKey={selectedNodeKey}
            breadcrumbs={breadcrumbs
              .map((w) => ({ key: treeBuild.nodeKeyByWidget.get(w) ?? '', label: w.type }))
              .filter((x) => x.key)}
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
