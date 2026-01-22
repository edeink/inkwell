import { ConfigProvider } from 'antd';
import { throttle } from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';

import Runtime from '../../../runtime';
import { getPathKeys, toAntTreeData, toTree } from '../../helper/tree';
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
import type { DataNode } from 'antd/es/tree';

import { findWidget } from '@/core/helper/widget-selector';

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

export interface DevToolsProps {
  onClose?: () => void;
  shortcut?: string | { combo: string; action?: 'toggle' | 'inspect' };
}

export function DevToolsPanel(props: DevToolsProps) {
  const [selected, setSelected] = useState<Widget | null>(null);
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

  const tree = useMemo(() => {
    void version;
    return toTree(runtime?.getRootWidget?.() ?? null);
  }, [runtime, version]);
  const treeData = useMemo(() => toAntTreeData(tree) as DataNode[], [tree]);

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

    lastTreeHashRef.current = computeWidgetTreeHash(runtime.getRootWidget?.() ?? null);
    setVersion((v) => v + 1);
    const update = throttle(
      () => {
        const nextHash = computeWidgetTreeHash(runtime.getRootWidget?.() ?? null);
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
    if (!k) {
      overlayRef.current?.setActive(false);
      overlayRef.current?.highlight(null);
      return;
    }
    const w = findWidget(runtime?.getRootWidget?.() ?? null, `#${k}`) as Widget | null;
    hoverRef.current = w;
    overlayRef.current?.setActive(true);
    overlayRef.current?.highlight(w);
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
