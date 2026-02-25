/**
 * Devtools 面板状态模块
 *
 * 负责面板可见性、运行时绑定、树数据构建、拾取与悬停等核心交互状态。
 * 注意事项：内部包含多个 reaction 与状态派生逻辑。
 * 潜在副作用：会读写全局状态、注册监听器与定时器。
 */
import { computed, makeAutoObservable, reaction, runInAction } from 'mobx';

import { DEVTOOLS_DOM_EVENTS, devtoolsResolveStateUpdate } from '../constants';
import {
  buildDevtoolsTree,
  computeRuntimeTreeHash,
  getNodeKeyByWidget,
  getPathNodeKeysByNodeKey,
} from '../helper/tree';

import type { Widget } from '@/core/base';
import type { DataNode } from '@/ui';

import { INKWELL_DEVTOOLS_INSPECT_ACTIVE } from '@/core/events/constants';
import Runtime from '@/runtime';

type BreadcrumbItem = { key: string; label: string };

/**
 * DevtoolsPanelStore
 *
 * 维护面板交互相关的所有状态与派生数据。
 * 注意事项：需要在 dispose 时释放 reaction 和监听器。
 * 潜在副作用：会修改全局 INSPECT 标记并注册 DOM 监听。
 */
export class DevtoolsPanelStore {
  visible = false;
  activeInspect = false;
  runtime: Runtime | null = null;
  selectedNodeKey: string | null = null;
  inspectHoverWidget: Widget | null = null;
  treeHoverWidget: Widget | null = null;
  pickedWidget: Widget | null = null;
  expandedKeys = new Set<string>();
  version = 0;
  isPageVisible = true;
  lastTreeHash = 0;
  runtimeId: string | null = null;
  isMultiRuntime = false;
  overlapWarning = false;
  canvasRegistryVersion = 0;
  private disposers: Array<() => void> = [];
  private treeHashDisposer: (() => void) | null = null;

  /**
   * 初始化面板状态与反应式副作用
   *
   * @remarks
   * 注意事项：依赖运行时与可见性变化触发树更新。
   * 潜在副作用：注册 reaction 并写入全局标记。
   */
  constructor() {
    makeAutoObservable(this, {
      breadcrumbs: computed.struct,
      treeData: computed.struct,
      overlayState: computed.struct,
    });
    this.disposers.push(
      reaction(
        () => this.activeInspect,
        (active: boolean) => {
          (globalThis as unknown as Record<string, unknown>)[INKWELL_DEVTOOLS_INSPECT_ACTIVE] =
            active;
        },
        { fireImmediately: true },
      ),
    );
    this.disposers.push(
      reaction(
        () => ({ active: this.activeInspect, enabled: this.inspectEnabled }),
        ({ active, enabled }: { active: boolean; enabled: boolean }) => {
          if (!enabled && active) {
            this.setActiveInspect(false);
          }
        },
      ),
    );
    this.disposers.push(
      reaction(
        () => this.runtime,
        (runtime: Runtime | null) => {
          this.setSelectedNodeKey(null);
          this.setExpandedKeys([]);
          this.setInspectHoverWidget(null);
          this.setTreeHoverWidget(null);
          this.setPickedWidget(null);
        },
        { fireImmediately: false },
      ),
    );
    this.disposers.push(
      reaction(
        () => this.pickedWidget,
        (picked: Widget | null) => {
          if (!picked) {
            return;
          }
          const nodeKey =
            this.treeBuild.nodeKeyByWidget.get(picked) ??
            (this.runtime ? getNodeKeyByWidget(this.runtime, picked) : null);
          if (!nodeKey) {
            this.setSelectedNodeKey(null);
            this.setPickedWidget(null);
            this.setActiveInspect(false);
            return;
          }
          if (nodeKey !== this.selectedNodeKey) {
            this.setSelectedNodeKey(nodeKey);
            this.setExpandedKeys(getPathNodeKeysByNodeKey(nodeKey));
            this.scrollToKey(nodeKey);
          }
          this.setPickedWidget(null);
          this.setActiveInspect(false);
        },
      ),
    );
    this.disposers.push(
      reaction(
        () => ({ runtime: this.runtime, visible: this.visible, pageVisible: this.isPageVisible }),
        () => {
          this.bindTreeHashListener();
        },
        { fireImmediately: true },
      ),
    );
    this.disposers.push(() => {
      if (this.treeHashDisposer) {
        this.treeHashDisposer();
        this.treeHashDisposer = null;
      }
    });
  }

  /**
   * 释放面板内部监听器与副作用
   *
   * @remarks
   * 注意事项：应在 DevtoolsRootStore.dispose 中调用。
   * 潜在副作用：会清理全局 INSPECT 标记。
   */
  dispose() {
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
    (globalThis as unknown as Record<string, unknown>)[INKWELL_DEVTOOLS_INSPECT_ACTIVE] = false;
  }

  /**
   * 当前拾取功能是否可用
   *
   * @returns 是否允许启用鼠标拾取
   * @remarks
   * 注意事项：由面板自身状态决定。
   * 潜在副作用：无。
   */
  get inspectEnabled(): boolean {
    return true;
  }

  /**
   * 构建并缓存当前运行时的树结构
   *
   * @returns 树构建结果（包含树节点与索引表）
   * @remarks
   * 注意事项：依赖 runtime 与 overlayRoot 的当前状态。
   * 潜在副作用：无。
   */
  get treeBuild() {
    if (!this.runtime) {
      return buildDevtoolsTree(null, null);
    }
    return buildDevtoolsTree(
      this.runtime?.getRootWidget?.() ?? null,
      this.runtime?.getOverlayRootWidget?.() ?? null,
    );
  }

  /**
   * 用于 Tree 组件的数据源
   *
   * @returns Tree 数据节点列表
   * @remarks
   * 注意事项：基于 treeBuild 的派生数据。
   * 潜在副作用：无。
   */
  get treeData(): DataNode[] {
    return this.treeBuild.treeData as DataNode[];
  }

  /**
   * 当前选中节点对应的 Widget
   *
   * @returns 选中的 Widget 或 null
   * @remarks
   * 注意事项：当 selectedNodeKey 为空时返回 null。
   * 潜在副作用：无。
   */
  get selectedWidget(): Widget | null {
    if (!this.selectedNodeKey) {
      return null;
    }
    return this.treeBuild.widgetByNodeKey.get(this.selectedNodeKey) ?? null;
  }

  /**
   * 当前选中节点的面包屑路径
   *
   * @returns 面包屑列表
   * @remarks
   * 注意事项：依赖 treeBuild 中的节点索引。
   * 潜在副作用：无。
   */
  get breadcrumbs(): BreadcrumbItem[] {
    if (!this.selectedNodeKey) {
      return [];
    }
    const keys = getPathNodeKeysByNodeKey(this.selectedNodeKey);
    return keys.map((k) => {
      const w = this.treeBuild.widgetByNodeKey.get(k) ?? null;
      return { key: k, label: w ? w.type : k };
    });
  }

  /**
   * Overlay 需要的状态快照
   *
   * @returns 是否激活与当前高亮 Widget
   * @remarks
   * 注意事项：依赖树 hover 与拾取 hover 的当前状态。
   * 潜在副作用：无。
   */
  get overlayState(): { active: boolean; widget: Widget | null } {
    const active = !!this.treeHoverWidget || (this.activeInspect && !!this.inspectHoverWidget);
    const widget = this.treeHoverWidget ?? (this.activeInspect ? this.inspectHoverWidget : null);
    return { active, widget };
  }

  /**
   * 更新面板可见性
   *
   * @param next 新的可见性或基于旧值的计算函数
   * @remarks
   * 注意事项：关闭时会自动退出拾取模式。
   * 潜在副作用：无。
   */
  setVisible(next: boolean | ((prev: boolean) => boolean)) {
    const resolved = devtoolsResolveStateUpdate('panel.visible', this.visible, next);
    this.visible = resolved;
    if (!resolved) {
      this.setActiveInspect(false);
    }
  }

  /**
   * 更新拾取模式状态
   *
   * @param next 新的拾取状态或基于旧值的计算函数
   * @remarks
   * 注意事项：在功能不可用时应避免设置为 true。
   * 潜在副作用：触发全局标记变更。
   */
  setActiveInspect(next: boolean | ((prev: boolean) => boolean)) {
    this.activeInspect = devtoolsResolveStateUpdate(
      'panel.activeInspect',
      this.activeInspect,
      next,
    );
  }

  /**
   * 切换拾取模式
   *
   * @remarks
   * 注意事项：当 inspectEnabled 为 false 时会强制关闭拾取。
   * 潜在副作用：无。
   */
  toggleInspect() {
    if (!this.inspectEnabled) {
      this.setActiveInspect(false);
      return;
    }
    this.setActiveInspect((v) => !v);
  }

  /**
   * 绑定运行时实例
   *
   * @param next 新的运行时或基于旧值的计算函数
   * @remarks
   * 注意事项：运行时切换会清空选中状态与悬停状态。
   * 潜在副作用：触发树构建与日志输出。
   */
  setRuntime(next: Runtime | null | ((prev: Runtime | null) => Runtime | null)) {
    this.runtime = devtoolsResolveStateUpdate('panel.runtime', this.runtime, next);
  }

  /**
   * 更新选中节点 key
   *
   * @param next 新的节点 key 或基于旧值的计算函数
   * @remarks
   * 注意事项：需确保 key 存在于当前树中。
   * 潜在副作用：影响面包屑与选中 Widget 的派生计算。
   */
  setSelectedNodeKey(next: string | null | ((prev: string | null) => string | null)) {
    this.selectedNodeKey = devtoolsResolveStateUpdate(
      'panel.selectedNodeKey',
      this.selectedNodeKey,
      next,
    );
  }

  /**
   * 更新拾取悬停 Widget
   *
   * @param next 新的 Widget 或基于旧值的计算函数
   * @remarks
   * 注意事项：仅在拾取模式开启时才有意义。
   * 潜在副作用：影响 overlayState 派生值。
   */
  setInspectHoverWidget(next: Widget | null | ((prev: Widget | null) => Widget | null)) {
    this.inspectHoverWidget = devtoolsResolveStateUpdate(
      'panel.inspectHoverWidget',
      this.inspectHoverWidget,
      next,
    );
  }

  /**
   * 更新树悬停 Widget
   *
   * @param next 新的 Widget 或基于旧值的计算函数
   * @remarks
   * 注意事项：仅在 Tree hover 联动开启时使用。
   * 潜在副作用：影响 overlayState 派生值。
   */
  setTreeHoverWidget(next: Widget | null | ((prev: Widget | null) => Widget | null)) {
    this.treeHoverWidget = devtoolsResolveStateUpdate(
      'panel.treeHoverWidget',
      this.treeHoverWidget,
      next,
    );
  }

  /**
   * 更新拾取完成的 Widget
   *
   * @param next 新的 Widget 或基于旧值的计算函数
   * @remarks
   * 注意事项：会触发选中节点与展开路径的联动。
   * 潜在副作用：可能触发滚动定位。
   */
  setPickedWidget(next: Widget | null | ((prev: Widget | null) => Widget | null)) {
    this.pickedWidget = devtoolsResolveStateUpdate('panel.pickedWidget', this.pickedWidget, next);
  }

  /**
   * 更新树展开节点集合
   *
   * @param next 新的 key 集合或基于旧值的计算函数
   * @remarks
   * 注意事项：会规范化为 Set 以保证去重。
   * 潜在副作用：影响 Tree 展开状态。
   */
  setExpandedKeys(next: Iterable<string> | ((prev: Set<string>) => Iterable<string>)) {
    const resolved = typeof next === 'function' ? next(this.expandedKeys) : next;
    const resolvedSet = resolved instanceof Set ? resolved : new Set(resolved);
    this.expandedKeys = devtoolsResolveStateUpdate(
      'panel.expandedKeys',
      this.expandedKeys,
      resolvedSet,
    );
  }

  /**
   * 更新页面可见性状态
   *
   * @param next 是否可见或基于旧值的计算函数
   * @remarks
   * 注意事项：与 document.visibilityState 联动。
   * 潜在副作用：影响树 hash 的更新节奏。
   */
  setIsPageVisible(next: boolean | ((prev: boolean) => boolean)) {
    this.isPageVisible = devtoolsResolveStateUpdate(
      'panel.isPageVisible',
      this.isPageVisible,
      next,
    );
  }

  /**
   * 更新当前运行时画布 ID
   *
   * @param next 新的 ID 或基于旧值的计算函数
   * @remarks
   * 注意事项：用于 UI 提示与多运行时判断。
   * 潜在副作用：无。
   */
  setRuntimeId(next: string | null | ((prev: string | null) => string | null)) {
    this.runtimeId = devtoolsResolveStateUpdate('mouse.runtimeId', this.runtimeId, next);
  }

  /**
   * 更新多运行时标记
   *
   * @param next 新的标记或基于旧值的计算函数
   * @remarks
   * 注意事项：由鼠标交互 hook 触发更新。
   * 潜在副作用：无。
   */
  setIsMultiRuntime(next: boolean | ((prev: boolean) => boolean)) {
    this.isMultiRuntime = devtoolsResolveStateUpdate(
      'mouse.isMultiRuntime',
      this.isMultiRuntime,
      next,
    );
  }

  /**
   * 更新画布重叠警告状态
   *
   * @param next 新的标记或基于旧值的计算函数
   * @remarks
   * 注意事项：用于在多画布覆盖场景提示用户。
   * 潜在副作用：无。
   */
  setOverlapWarning(next: boolean | ((prev: boolean) => boolean)) {
    this.overlapWarning = devtoolsResolveStateUpdate(
      'mouse.overlapWarning',
      this.overlapWarning,
      next,
    );
  }

  /**
   * 递增树版本号
   *
   * @remarks
   * 注意事项：用于触发 treeBuild 的重新计算。
   * 潜在副作用：无。
   */
  bumpVersion() {
    this.version = devtoolsResolveStateUpdate('panel.version', this.version, (v) => v + 1);
  }

  /**
   * 递增运行时画布注册版本号
   *
   * @remarks
   * 注意事项：用于刷新画布注册表缓存。
   * 潜在副作用：无。
   */
  bumpCanvasRegistryVersion() {
    this.canvasRegistryVersion = devtoolsResolveStateUpdate(
      'mouse.canvasRegistryVersion',
      this.canvasRegistryVersion,
      (v) => v + 1,
    );
  }

  /**
   * 处理树节点悬停
   *
   * @param k 目标节点 key 或 null
   * @remarks
   * 注意事项：当 key 为空时清理 hover 状态。
   * 潜在副作用：会更新 overlayState。
   */
  handleHoverKey(k: string | null) {
    if (!k) {
      this.setTreeHoverWidget(null);
      return;
    }
    const w = this.treeBuild.widgetByNodeKey.get(k) ?? null;
    this.setTreeHoverWidget(w);
  }

  /**
   * 处理树节点选择
   *
   * @param k 目标节点 key
   * @remarks
   * 注意事项：若节点无效会清空选中状态。
   * 潜在副作用：可能触发展开与滚动定位。
   */
  handleSelectKey(k: string) {
    const w = this.treeBuild.widgetByNodeKey.get(k) ?? null;
    this.setSelectedNodeKey(w ? k : null);
    if (w) {
      this.setExpandedKeys(getPathNodeKeysByNodeKey(k));
    }
  }

  /**
   * 处理面包屑点击
   *
   * @param k 目标节点 key
   * @remarks
   * 注意事项：会同步选中并滚动到目标节点。
   * 潜在副作用：触发滚动定位。
   */
  handleClickBreadcrumbKey(k: string) {
    this.handleSelectKey(k);
    this.scrollToKey(k);
  }

  /**
   * 打印当前选中 Widget
   *
   * @remarks
   * 注意事项：保留方法以兼容面板回调。
   * 潜在副作用：无。
   */
  handlePrintSelected() {
    return;
  }

  /**
   * 将树节点滚动到可视区域
   *
   * @param k 目标节点 key
   * @remarks
   * 注意事项：依赖 DOM 查询，需在浏览器环境使用。
   * 潜在副作用：触发滚动行为。
   */
  scrollToKey(k: string) {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-key="${k}"]`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    });
  }

  /**
   * 监听页面可见性变化
   *
   * @returns 解除监听的清理函数
   * @remarks
   * 注意事项：使用 document.visibilityState。
   * 潜在副作用：注册 DOM 事件监听器。
   */
  attachPageVisibility() {
    const handleVisibilityChange = () => {
      this.setIsPageVisible(!document.hidden);
    };
    this.setIsPageVisible(!document.hidden);
    document.addEventListener(DEVTOOLS_DOM_EVENTS.VISIBILITYCHANGE, handleVisibilityChange);
    return () => {
      document.removeEventListener(DEVTOOLS_DOM_EVENTS.VISIBILITYCHANGE, handleVisibilityChange);
    };
  }

  private bindTreeHashListener() {
    if (this.treeHashDisposer) {
      this.treeHashDisposer();
      this.treeHashDisposer = null;
    }
    if (!this.runtime || !this.visible || !this.isPageVisible) {
      return;
    }
    this.lastTreeHash = computeRuntimeTreeHash(this.runtime);
    this.bumpVersion();
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | null = null;
    const run = () => {
      idleId = null;
      const nextHash = computeRuntimeTreeHash(this.runtime!);
      if (nextHash === this.lastTreeHash) {
        return;
      }
      runInAction(() => {
        this.lastTreeHash = nextHash;
        this.bumpVersion();
      });
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
    const update = debounceSchedule(schedule, 250);
    const dispose = this.runtime.addTickListener(update);
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) {
        return;
      }
      cleaned = true;
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
    this.treeHashDisposer = cleanup;
  }
}

type Debounced = (() => void) & { cancel: () => void };

/**
 * 创建去抖调度函数
 *
 * @param fn 实际执行函数
 * @param waitMs 去抖窗口
 * @returns 带 cancel 方法的调度函数
 * @remarks
 * 注意事项：基于 setTimeout，不保证在后台标签页准确触发。
 * 潜在副作用：会创建定时器。
 */
function debounceSchedule(fn: () => void, waitMs: number): Debounced {
  let timer = 0;
  const run = (() => {
    if (timer) {
      return;
    }
    timer = window.setTimeout(() => {
      timer = 0;
      fn();
    }, waitMs);
  }) as Debounced;
  run.cancel = () => {
    if (timer) {
      window.clearTimeout(timer);
      timer = 0;
    }
  };
  return run;
}
