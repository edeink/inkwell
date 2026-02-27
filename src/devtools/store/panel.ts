import { create } from 'zustand';

import {
  buildDevtoolsTree,
  type DevtoolsTreeBuild,
  getNodeKeyByWidget,
  getPathNodeKeysByNodeKey,
} from '../helper/tree';

import type { Widget } from '@/core/base';

import { INKWELL_DEVTOOLS_INSPECT_ACTIVE } from '@/core/events/constants';
import Runtime from '@/runtime';

/**
 * DevTools 面板核心状态
 */
interface PanelState {
  // --- 基础状态 ---
  /** 面板是否可见 */
  visible: boolean;
  /** 是否处于拾取模式 */
  activeInspect: boolean;
  /** 当前绑定的 Runtime 实例 */
  runtime: Runtime | null;
  /** 当前选中的节点 Key */
  selectedNodeKey: string | null;
  /** 拾取模式下悬停的 Widget */
  inspectHoverWidget: Widget | null;
  /** 树视图中悬停的 Widget */
  treeHoverWidget: Widget | null;
  /** 拾取选中的 Widget (临时状态) */
  pickedWidget: Widget | null;
  /** 展开的节点 Key 集合 */
  expandedKeys: Set<string>;
  /** 状态版本号 (用于强制刷新) */
  version: number;
  /** 页面是否可见 (用于暂停更新) */
  isPageVisible: boolean;
  /** 上一次计算的树 Hash (用于检测变更) */
  lastTreeHash: number;
  /** 当前 Runtime ID */
  runtimeId: string | null;
  /** 是否存在多个 Runtime */
  isMultiRuntime: boolean;
  /** 是否存在重叠告警 */
  overlapWarning: boolean;
  /** Canvas 注册表版本号 */
  canvasRegistryVersion: number;

  // --- 派生状态 (缓存) ---
  /** 构建后的 DevTools 树数据 */
  treeBuild: DevtoolsTreeBuild;

  // --- Actions (状态更新) ---
  setVisible: (next: boolean | ((prev: boolean) => boolean)) => void;
  setActiveInspect: (next: boolean | ((prev: boolean) => boolean)) => void;
  toggleInspect: () => void;
  setRuntime: (next: Runtime | null | ((prev: Runtime | null) => Runtime | null)) => void;
  setSelectedNodeKey: (next: string | null | ((prev: string | null) => string | null)) => void;
  setInspectHoverWidget: (next: Widget | null | ((prev: Widget | null) => Widget | null)) => void;
  setTreeHoverWidget: (next: Widget | null | ((prev: Widget | null) => Widget | null)) => void;
  setPickedWidget: (next: Widget | null | ((prev: Widget | null) => Widget | null)) => void;
  setExpandedKeys: (next: Iterable<string> | ((prev: Set<string>) => Iterable<string>)) => void;
  setIsPageVisible: (next: boolean | ((prev: boolean) => boolean)) => void;
  setRuntimeId: (next: string | null | ((prev: string | null) => string | null)) => void;
  setIsMultiRuntime: (next: boolean | ((prev: boolean) => boolean)) => void;
  setOverlapWarning: (next: boolean | ((prev: boolean) => boolean)) => void;
  bumpVersion: () => void;
  bumpCanvasRegistryVersion: () => void;

  // --- 业务逻辑 ---
  /** 处理节点悬停 */
  handleHoverKey: (key: string | null) => void;
  /** 处理节点选中 */
  handleSelectKey: (key: string) => void;
  /** 更新树构建数据 */
  updateTreeBuild: () => void;
  /** 打印选中组件到控制台 */
  handlePrintSelected: () => void;
  /** 处理面包屑点击 */
  handleClickBreadcrumbKey: (key: string) => void;
}

/**
 * Panel Store - 核心业务状态管理
 */
export const usePanelStore = create<PanelState>((set, get) => ({
  // --- 初始状态 ---
  visible: false,
  activeInspect: false,
  runtime: null,
  selectedNodeKey: null,
  inspectHoverWidget: null,
  treeHoverWidget: null,
  pickedWidget: null,
  expandedKeys: new Set(),
  version: 0,
  isPageVisible: true,
  lastTreeHash: 0,
  runtimeId: null,
  isMultiRuntime: false,
  overlapWarning: false,
  canvasRegistryVersion: 0,

  treeBuild: buildDevtoolsTree(null, null),

  // --- Actions ---

  setVisible: (next) => {
    set((state) => {
      const newVal =
        typeof next === 'function' ? (next as (prev: boolean) => boolean)(state.visible) : next;
      if (newVal === state.visible) {
        return state;
      }

      const changes: Partial<PanelState> = { visible: newVal };
      if (!newVal && state.activeInspect) {
        // 关闭面板时自动关闭 inspect，并同步全局标记
        (globalThis as unknown as Record<string, unknown>)[INKWELL_DEVTOOLS_INSPECT_ACTIVE] = false;
        changes.activeInspect = false;
        changes.inspectHoverWidget = null;
      }

      return changes;
    });
  },

  setActiveInspect: (next) => {
    set((state) => {
      const newVal =
        typeof next === 'function'
          ? (next as (prev: boolean) => boolean)(state.activeInspect)
          : next;
      if (newVal === state.activeInspect) {
        return state;
      }

      // 副作用：更新全局标记，用于 Runtime 层的事件拦截等
      (globalThis as unknown as Record<string, unknown>)[INKWELL_DEVTOOLS_INSPECT_ACTIVE] = newVal;

      return { activeInspect: newVal, inspectHoverWidget: null };
    });
  },

  toggleInspect: () => {
    const { activeInspect, setActiveInspect } = get();
    setActiveInspect(!activeInspect);
  },

  setRuntime: (next) => {
    set((state) => {
      const newVal =
        typeof next === 'function'
          ? (next as (prev: Runtime | null) => Runtime | null)(state.runtime)
          : next;
      if (newVal === state.runtime) {
        return state;
      }

      // Runtime 切换时重置相关状态
      const changes: Partial<PanelState> = {
        runtime: newVal,
        runtimeId: newVal?.getCanvasId?.() ?? null,
        selectedNodeKey: null,
        expandedKeys: new Set(),
        inspectHoverWidget: null,
        treeHoverWidget: null,
        pickedWidget: null,
      };

      // 立即更新 treeBuild
      const newTreeBuild = buildDevtoolsTree(
        newVal?.getRootWidget?.() ?? null,
        newVal?.getOverlayRootWidget?.() ?? null,
      );

      return { ...changes, treeBuild: newTreeBuild };
    });
  },

  setSelectedNodeKey: (next) => {
    set((state) => {
      const newVal =
        typeof next === 'function'
          ? (next as (prev: string | null) => string | null)(state.selectedNodeKey)
          : next;
      return newVal !== state.selectedNodeKey ? { selectedNodeKey: newVal } : state;
    });
  },

  setInspectHoverWidget: (next) => {
    set((state) => {
      const newVal =
        typeof next === 'function'
          ? (next as (prev: Widget | null) => Widget | null)(state.inspectHoverWidget)
          : next;
      return newVal !== state.inspectHoverWidget ? { inspectHoverWidget: newVal } : state;
    });
  },

  setTreeHoverWidget: (next) => {
    set((state) => {
      const newVal =
        typeof next === 'function'
          ? (next as (prev: Widget | null) => Widget | null)(state.treeHoverWidget)
          : next;
      return newVal !== state.treeHoverWidget ? { treeHoverWidget: newVal } : state;
    });
  },

  setPickedWidget: (next) => {
    set((state) => {
      const newVal =
        typeof next === 'function'
          ? (next as (prev: Widget | null) => Widget | null)(state.pickedWidget)
          : next;
      if (newVal === state.pickedWidget) {
        return state;
      }

      // 处理 pickedWidget 变化的副作用: 自动选中并退出 inspect 模式
      if (newVal) {
        const { treeBuild, runtime, selectedNodeKey } = state;
        const nodeKey =
          treeBuild.nodeKeyByWidget.get(newVal) ??
          (runtime ? getNodeKeyByWidget(runtime, newVal) : null);

        if (nodeKey) {
          if (nodeKey !== selectedNodeKey) {
            const newExpanded = getPathNodeKeysByNodeKey(nodeKey);
            // 批量更新
            (globalThis as unknown as Record<string, unknown>)[INKWELL_DEVTOOLS_INSPECT_ACTIVE] =
              false;
            return {
              pickedWidget: null, // 消费掉 picked 状态
              activeInspect: false,
              selectedNodeKey: nodeKey,
              expandedKeys: new Set(newExpanded),
            };
          }
        }

        (globalThis as unknown as Record<string, unknown>)[INKWELL_DEVTOOLS_INSPECT_ACTIVE] = false;
        return { pickedWidget: null, activeInspect: false };
      }

      return { pickedWidget: newVal };
    });
  },

  setExpandedKeys: (next) => {
    set((state) => {
      const resolved = typeof next === 'function' ? next(state.expandedKeys) : next;
      const resolvedSet = resolved instanceof Set ? resolved : new Set(resolved);
      return { expandedKeys: resolvedSet };
    });
  },

  setIsPageVisible: (next) => {
    set((state) => {
      const newVal =
        typeof next === 'function'
          ? (next as (prev: boolean) => boolean)(state.isPageVisible)
          : next;
      return newVal !== state.isPageVisible ? { isPageVisible: newVal } : state;
    });
  },

  setRuntimeId: (next) => {
    set((state) => {
      const newVal =
        typeof next === 'function'
          ? (next as (prev: string | null) => string | null)(state.runtimeId)
          : next;
      return newVal !== state.runtimeId ? { runtimeId: newVal } : state;
    });
  },

  setIsMultiRuntime: (next) => {
    set((state) => {
      const newVal =
        typeof next === 'function'
          ? (next as (prev: boolean) => boolean)(state.isMultiRuntime)
          : next;
      return newVal !== state.isMultiRuntime ? { isMultiRuntime: newVal } : state;
    });
  },

  setOverlapWarning: (next) => {
    set((state) => {
      const newVal =
        typeof next === 'function'
          ? (next as (prev: boolean) => boolean)(state.overlapWarning)
          : next;
      return newVal !== state.overlapWarning ? { overlapWarning: newVal } : state;
    });
  },

  bumpVersion: () => {
    set((state) => ({ version: state.version + 1 }));
  },

  bumpCanvasRegistryVersion: () => {
    set((state) => ({ canvasRegistryVersion: state.canvasRegistryVersion + 1 }));
  },

  // --- 业务逻辑 ---

  handleHoverKey: (key) => {
    const { treeBuild } = get();
    if (!key) {
      set({ treeHoverWidget: null });
      return;
    }
    const w = treeBuild.widgetByNodeKey.get(key) ?? null;
    set({ treeHoverWidget: w });
  },

  handleSelectKey: (key: string) => {
    get().setSelectedNodeKey(key);
    // 选中时自动展开父级路径
    const pathKeys = getPathNodeKeysByNodeKey(key);
    const newExpanded = new Set(get().expandedKeys);
    let changed = false;
    for (const k of pathKeys) {
      if (!newExpanded.has(k)) {
        newExpanded.add(k);
        changed = true;
      }
    }
    if (changed) {
      get().setExpandedKeys(newExpanded);
    }
  },

  updateTreeBuild: () => {
    const { runtime } = get();
    if (!runtime) {
      return;
    }
    const newTreeBuild = buildDevtoolsTree(
      runtime.getRootWidget?.() ?? null,
      runtime.getOverlayRootWidget?.() ?? null,
    );
    set({ treeBuild: newTreeBuild });
  },

  handlePrintSelected: () => {
    const { selectedNodeKey, treeBuild } = get();
    if (!selectedNodeKey) {
      return;
    }
    const widget = treeBuild.widgetByNodeKey.get(selectedNodeKey);
    if (widget) {
      console.log('Selected Widget:', widget);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).$w = widget;
      console.log('Assigned to window.$w');
    }
  },

  handleClickBreadcrumbKey: (key: string) => {
    get().handleSelectKey(key);
  },
}));
