/**
 * Devtools 布局状态模块
 *
 * 负责面板停靠方向、尺寸与分割尺寸的状态管理与持久化。
 * 注意事项：该模块会在状态变化时写入本地存储。
 * 潜在副作用：会触发 localStorage 写入与 MobX reaction 回调。
 */
import { computed, makeAutoObservable, reaction } from 'mobx';

import { devtoolsResolveStateUpdate } from '../constants';

import type { Dock, LayoutInfo } from '../components/layout';

import {
  DEVTOOLS_LAYOUT,
  DEVTOOLS_SPLIT,
  DEVTOOLS_SPLIT_DEFAULT,
  getDevtoolsDefaultLayout,
} from '@/utils/local-storage';

/**
 * DevtoolsLayoutStore
 *
 * 维护布局相关的响应式状态，并负责持久化布局与分割信息。
 * 注意事项：构造时会读取本地存储，未命中时使用默认布局。
 * 潜在副作用：reaction 会在变化时写入本地存储。
 */
export class DevtoolsLayoutStore {
  dock: Dock;
  width: number;
  height: number;
  treeWidth: number;
  treeHeight: number;
  isNarrow = false;

  /**
   * 初始化布局状态
   *
   * @remarks
   * 注意事项：优先读取本地存储，避免覆盖用户配置。
   * 潜在副作用：注册 reaction 写入本地存储。
   */
  constructor() {
    const initialLayout = DEVTOOLS_LAYOUT.get() ?? getDevtoolsDefaultLayout();
    const initialSplit = DEVTOOLS_SPLIT.get() ?? DEVTOOLS_SPLIT_DEFAULT;
    this.dock = initialLayout.dock;
    this.width = initialLayout.width;
    this.height = initialLayout.height;
    this.treeWidth = initialSplit.treeWidth;
    this.treeHeight = initialSplit.treeHeight;
    makeAutoObservable(this, {
      layoutInfo: computed.struct,
    });
    reaction(
      () => [this.dock, this.width, this.height],
      () => {
        DEVTOOLS_LAYOUT.set({ dock: this.dock, width: this.width, height: this.height });
      },
    );
    reaction(
      () => [this.treeWidth, this.treeHeight],
      () => {
        DEVTOOLS_SPLIT.set({ treeWidth: this.treeWidth, treeHeight: this.treeHeight });
      },
    );
  }

  /**
   * 当前布局信息快照
   *
   * @returns 布局与分割尺寸组合的只读快照
   * @remarks
   * 注意事项：该值为派生数据，使用 computed.struct 做结构比较。
   * 潜在副作用：无。
   */
  get layoutInfo(): LayoutInfo {
    return {
      dock: this.dock,
      width: this.width,
      height: this.height,
      treeWidth: this.treeWidth,
      treeHeight: this.treeHeight,
      isNarrow: this.isNarrow,
    };
  }

  /**
   * 更新停靠方向
   *
   * @param next 新的停靠方向或基于旧值的计算函数
   * @remarks
   * 注意事项：使用统一的状态更新器，确保调试日志一致。
   * 潜在副作用：触发本地存储写入。
   */
  setDock(next: Dock | ((prev: Dock) => Dock)) {
    this.dock = devtoolsResolveStateUpdate('layout.dock', this.dock, next);
  }

  /**
   * 更新面板宽度
   *
   * @param next 新的宽度或基于旧值的计算函数
   * @remarks
   * 注意事项：宽度单位与布局容器一致，避免传入 NaN。
   * 潜在副作用：触发本地存储写入。
   */
  setWidth(next: number | ((prev: number) => number)) {
    this.width = devtoolsResolveStateUpdate('layout.width', this.width, next);
  }

  /**
   * 更新面板高度
   *
   * @param next 新的高度或基于旧值的计算函数
   * @remarks
   * 注意事项：高度单位与布局容器一致，避免传入 NaN。
   * 潜在副作用：触发本地存储写入。
   */
  setHeight(next: number | ((prev: number) => number)) {
    this.height = devtoolsResolveStateUpdate('layout.height', this.height, next);
  }

  /**
   * 更新树面板宽度
   *
   * @param next 新的树面板宽度或基于旧值的计算函数
   * @remarks
   * 注意事项：用于左右分割场景的树面板尺寸。
   * 潜在副作用：触发本地存储写入。
   */
  setTreeWidth(next: number | ((prev: number) => number)) {
    this.treeWidth = devtoolsResolveStateUpdate('layout.treeWidth', this.treeWidth, next);
  }

  /**
   * 更新树面板高度
   *
   * @param next 新的树面板高度或基于旧值的计算函数
   * @remarks
   * 注意事项：用于上下分割场景的树面板尺寸。
   * 潜在副作用：触发本地存储写入。
   */
  setTreeHeight(next: number | ((prev: number) => number)) {
    this.treeHeight = devtoolsResolveStateUpdate('layout.treeHeight', this.treeHeight, next);
  }

  /**
   * 更新窄屏状态
   *
   * @param next 是否窄屏或基于旧值的计算函数
   * @remarks
   * 注意事项：窄屏判断由布局容器负责计算并回传。
   * 潜在副作用：无。
   */
  setIsNarrow(next: boolean | ((prev: boolean) => boolean)) {
    this.isNarrow = devtoolsResolveStateUpdate('layout.isNarrow', this.isNarrow, next);
  }
}
