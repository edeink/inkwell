import { create } from 'zustand';

import type { Dock, LayoutInfo } from '../components/layout';

import {
  DEVTOOLS_LAYOUT,
  DEVTOOLS_SPLIT,
  DEVTOOLS_SPLIT_DEFAULT,
  getDevtoolsDefaultLayout,
} from '@/utils/local-storage';

/**
 * Devtools 布局状态 Hook
 *
 * 管理面板停靠、尺寸、分割与响应式布局状态。
 * 注意事项：状态变更会自动同步到 localStorage。
 */
interface LayoutState {
  dock: Dock;
  width: number;
  height: number;
  treeWidth: number;
  treeHeight: number;
  isNarrow: boolean;

  /**
   * 更新停靠位置
   * @param next 新位置或更新函数
   */
  setDock: (next: Dock | ((prev: Dock) => Dock)) => void;

  /**
   * 更新面板宽度
   * @param next 新宽度或更新函数
   */
  setWidth: (next: number | ((prev: number) => number)) => void;

  /**
   * 更新面板高度
   * @param next 新高度或更新函数
   */
  setHeight: (next: number | ((prev: number) => number)) => void;

  /**
   * 更新树面板宽度
   * @param next 新宽度或更新函数
   */
  setTreeWidth: (next: number | ((prev: number) => number)) => void;

  /**
   * 更新树面板高度
   * @param next 新高度或更新函数
   */
  setTreeHeight: (next: number | ((prev: number) => number)) => void;

  /**
   * 更新窄屏状态
   * @param next 新状态或更新函数
   */
  setIsNarrow: (next: boolean | ((prev: boolean) => boolean)) => void;
}

// 初始化状态
const initialLayout = DEVTOOLS_LAYOUT.get() ?? getDevtoolsDefaultLayout();
const initialSplit = DEVTOOLS_SPLIT.get() ?? DEVTOOLS_SPLIT_DEFAULT;

export const useLayoutStore = create<LayoutState>((set, get) => ({
  dock: initialLayout.dock,
  width: initialLayout.width,
  height: initialLayout.height,
  treeWidth: initialSplit.treeWidth,
  treeHeight: initialSplit.treeHeight,
  isNarrow: false,

  setDock: (next) => {
    set((state) => {
      const newDock =
        typeof next === 'function' ? (next as (prev: Dock) => Dock)(state.dock) : next;
      if (newDock !== state.dock) {
        DEVTOOLS_LAYOUT.set({ dock: newDock, width: state.width, height: state.height });
        return { dock: newDock };
      }
      return state;
    });
  },

  setWidth: (next) => {
    set((state) => {
      const newWidth =
        typeof next === 'function' ? (next as (prev: number) => number)(state.width) : next;
      if (newWidth !== state.width) {
        DEVTOOLS_LAYOUT.set({ dock: state.dock, width: newWidth, height: state.height });
        return { width: newWidth };
      }
      return state;
    });
  },

  setHeight: (next) => {
    set((state) => {
      const newHeight =
        typeof next === 'function' ? (next as (prev: number) => number)(state.height) : next;
      if (newHeight !== state.height) {
        DEVTOOLS_LAYOUT.set({ dock: state.dock, width: state.width, height: newHeight });
        return { height: newHeight };
      }
      return state;
    });
  },

  setTreeWidth: (next) => {
    set((state) => {
      const newWidth =
        typeof next === 'function' ? (next as (prev: number) => number)(state.treeWidth) : next;
      if (newWidth !== state.treeWidth) {
        DEVTOOLS_SPLIT.set({ treeWidth: newWidth, treeHeight: state.treeHeight });
        return { treeWidth: newWidth };
      }
      return state;
    });
  },

  setTreeHeight: (next) => {
    set((state) => {
      const newHeight =
        typeof next === 'function' ? (next as (prev: number) => number)(state.treeHeight) : next;
      if (newHeight !== state.treeHeight) {
        DEVTOOLS_SPLIT.set({ treeWidth: state.treeWidth, treeHeight: newHeight });
        return { treeHeight: newHeight };
      }
      return state;
    });
  },

  setIsNarrow: (next) => {
    set((state) => {
      const newIsNarrow =
        typeof next === 'function' ? (next as (prev: boolean) => boolean)(state.isNarrow) : next;
      return newIsNarrow !== state.isNarrow ? { isNarrow: newIsNarrow } : state;
    });
  },
}));

/**
 * 获取布局信息的 Selector
 * 用于组件只订阅布局数据变化
 */
export const selectLayoutInfo = (state: LayoutState): LayoutInfo => ({
  dock: state.dock,
  width: state.width,
  height: state.height,
  treeWidth: state.treeWidth,
  treeHeight: state.treeHeight,
  isNarrow: state.isNarrow,
});
