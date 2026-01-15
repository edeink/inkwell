/** @jsxImportSource @/utils/compiler */
import { ConnectorStyle } from './helpers/connection-drawer';
import { AddChildNodeCommand, AddSiblingNodeCommand } from './helpers/shortcut/commands/edit';
import { makeInitialState } from './helpers/state-helper';
import { MindMapModel } from './mindmap-model';
import { CustomComponentType, Side } from './type';
import { Connector } from './widgets/connector';
import { MindMapEditorOverlay, type MindMapEditorRect } from './widgets/mindmap-editor-overlay';
import { MindMapLayout } from './widgets/mindmap-layout';
import { MindMapNode } from './widgets/mindmap-node';
import { MindMapNodeToolbar } from './widgets/mindmap-node-toolbar';
import { MindMapViewport } from './widgets/mindmap-viewport';

import type { GraphState, NodeId, SelectionData } from './type';
import type { MindMapViewport as MindMapViewportCls } from './widgets/mindmap-viewport';
import type { Widget, WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';
import type { ThemePalette } from '@/styles/theme';

import { Stack, StatefulWidget } from '@/core';
import { transformPoint } from '@/core/helper/transform';
import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';

interface SceneProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
}
type SceneState = {
  graph: GraphState;
  viewState: { scale: number; tx: number; ty: number };
  selectedKeys: string[];
  editingKey: string | null;
  activeKey: string | null;
  editorRect: MindMapEditorRect | null;
};

/**
 * 创建 Mindmap 场景
 * @param width 视口宽度（像素）
 * @param height 视口高度（像素）
 * @param initialGraph 初始图数据（可选）
 */
export class MindmapDemo extends StatefulWidget<SceneProps, SceneState> {
  private nodePropsCache: Map<
    NodeId,
    {
      title: string;
      prefSide?: Side;
      activeKey: NodeId | null;
      active: boolean;
      isEditing: boolean;
      isRoot: boolean;
      theme?: ThemePalette;
    }
  > = new Map();
  private nodeElementCache: Map<NodeId, MindMapNode> = new Map();
  private edgeElementCache: Map<string, Connector> = new Map();
  private editingSessionKey: string | null = null;

  constructor(data: SceneProps) {
    super(data);
    this.state = {
      graph: makeInitialState(),
      viewState: { scale: 1, tx: 0, ty: 0 },
      selectedKeys: [],
      editingKey: null,
      activeKey: null,
      editorRect: null,
    };
  }

  private editorRectRaf: number | null = null;

  dispose(): void {
    if (this.editorRectRaf != null) {
      cancelAnimationFrame(this.editorRectRaf);
      this.editorRectRaf = null;
    }
    super.dispose();
  }

  private getViewport(): MindMapViewportCls | null {
    const rt = this.runtime;
    if (!rt) {
      return null;
    }
    const rtx = rt as Runtime;
    const root = typeof rtx.getRootWidget === 'function' ? rtx.getRootWidget() : null;
    return findWidget(root, `#${CustomComponentType.MindMapViewport}`) as MindMapViewportCls | null;
  }

  private onScroll = (): void => {
    // 通知 Controller 视图变更（因为 Viewport 内容偏移改变了）
    // @ts-expect-error 运行时扩展
    const ctrl = this.runtime.__mindmapController;
    if (ctrl && typeof ctrl.notifyViewChange === 'function') {
      ctrl.notifyViewChange();
    }
    this.scheduleSyncEditorRect();
  };

  private onZoomAt = (scale: number, cx: number, cy: number): void => {
    const vp = this.getViewport();
    if (!vp) {
      return;
    }
    vp.zoomAt(scale, cx, cy);
    vp.markDirty();

    // 通知 Controller 视图变更
    // @ts-expect-error 运行时扩展
    const ctrl = this.runtime.__mindmapController;
    if (ctrl && typeof ctrl.notifyViewChange === 'function') {
      ctrl.notifyViewChange();
    }
    this.scheduleSyncEditorRect();
  };

  // onRenderComplete 移除：统一由基类调度下一 Tick

  /**
   * 删除当前激活节点与框选节点对应的子树，并返回用于撤销的快照。
   *
   * @returns SelectionData | void
   */
  private onDeleteSelection = (): SelectionData | void => {
    const vp = this.getViewport();
    const cur = (this.state as SceneState).graph;
    const currentActiveKey = (this.state as SceneState).activeKey;
    if (!vp) {
      return;
    }
    const keys: string[] = [];
    if (currentActiveKey) {
      keys.push(currentActiveKey);
    }
    if (Array.isArray(vp.selectedKeys) && vp.selectedKeys.length) {
      keys.push(...vp.selectedKeys);
    }
    if (!keys.length) {
      return;
    }
    const res = MindMapModel.deleteSubtrees(cur, keys);
    this.setState({ graph: res.graph, activeKey: null });
    return res.deleted;
  };

  /**
   * 将撤销数据恢复回图中（用于撤销删除）。
   *
   * @param data 待恢复的节点与边
   * @returns void
   */
  private onRestoreSelection = (data: SelectionData): void => {
    if (!data || !data.nodes || !data.edges) {
      return;
    }
    const cur = (this.state as SceneState).graph;
    const next = MindMapModel.restoreSelection(cur, data);
    this.setState({ graph: next });
  };

  /**
   * 设置当前选中节点 key 列表。
   *
   * @param keys 选中 key 列表
   * @returns void
   */
  private onSetSelectedKeys = (keys: string[]): void => {
    this.setState({
      selectedKeys: keys,
    });
  };

  /**
   * 切换编辑节点，并计算编辑器覆盖层的位置与尺寸。
   *
   * @param key 进入编辑的节点 key；传 null 表示退出编辑态
   * @returns void
   */
  private onEditingKeyChange = (key: string | null): void => {
    if (key) {
      this.editingSessionKey = key;
    }
    const rect = key ? this.computeEditorRect(key) : null;
    this.setState({ editingKey: key, editorRect: rect });
    if (key) {
      this.scheduleSyncEditorRect();
    }
  };

  /**
   * 编辑事件入口：
   * - 当 key 非空时进入/切换编辑态
   * - 当 key 为 null 且 value 提供时，将文本回写到节点标题并退出编辑态
   *
   * @param key 目标编辑节点 key；传 null 表示结束编辑
   * @param value 结束编辑时提交的标题文本（可选）
   * @returns void
   */
  private onEdit = (key: string | null, value?: string): void => {
    const curState = this.state as SceneState;
    const cur = curState.graph;
    const editingKey = curState.editingKey;

    let nextGraph = cur;
    if (typeof value === 'string') {
      const targetKey = this.editingSessionKey ?? editingKey ?? key;
      if (targetKey) {
        nextGraph = MindMapModel.setNodeTitle(cur, targetKey, value);
      }
    }

    const nextEditingKey = key;
    const rect = nextEditingKey ? this.computeEditorRect(nextEditingKey) : null;
    this.setState({ graph: nextGraph, editingKey: nextEditingKey, editorRect: rect });
    if (!nextEditingKey) {
      this.editingSessionKey = null;
    } else {
      this.editingSessionKey = nextEditingKey;
    }
    if (nextEditingKey) {
      this.scheduleSyncEditorRect();
    }
  };

  /**
   * 提交编辑内容并写回节点标题。
   *
   * @param value 最终标题文本
   * @returns void
   */
  private commitEditing = (value: string): void => {
    const curState = this.state as SceneState;
    const targetKey = this.editingSessionKey ?? curState.editingKey;
    if (!targetKey) {
      return;
    }
    const cur = curState.graph;
    const nextGraph = MindMapModel.setNodeTitle(cur, targetKey, value);
    if (nextGraph === cur) {
      return;
    }
    this.setState({ graph: nextGraph });
    this.scheduleSyncEditorRect();
  };

  /**
   * 取消编辑并退出编辑态（不写回数据）。
   *
   * @returns void
   */
  private cancelEditing = (): void => {
    this.editingSessionKey = null;
    this.setState({ editingKey: null, editorRect: null });
  };

  /**
   * 切换激活节点，并触发版本递增以刷新视图。
   *
   * @param key 激活节点 key；传 null 表示清空
   * @returns void
   */
  private onActive = (key: string | null): void => {
    const cur = (this.state as SceneState).graph;
    const next: GraphState = MindMapModel.touch(cur);

    // 如果激活了新节点，且之前有选区，清除选区
    let selectedKeys = (this.state as SceneState).selectedKeys;
    if (key && selectedKeys.length > 0) {
      selectedKeys = [];
    }

    this.setState({
      graph: next,
      selectedKeys,
      // 切换激活节点时，通常退出编辑模式，除非是由双击触发（由 onEditingKeyChange 处理）
      editingKey: null,
      editorRect: null,
      activeKey: key ?? null,
    });
  };

  /**
   * 键盘事件入口：转交给 Viewport 处理快捷键与交互。
   *
   * @param e 键盘事件
   * @returns boolean | void
   */
  onKeyDown(e: InkwellEvent): boolean | void {
    const vp = this.getViewport();
    if (vp) {
      return vp.onKeyDown(e);
    }
  }

  /**
   * 在参照节点旁新增兄弟节点，并将其设为激活/编辑。
   *
   * @param refKey 参照节点 key
   * @param dir 插入方向：-1 前置；1 后置
   * @param side 可选偏好侧
   * @returns 新节点 key；若新增失败则返回 void
   */
  private handleAddSiblingNode = (refKey: string, dir: -1 | 1, side?: Side): string | void => {
    const cur = (this.state as SceneState).graph;
    const res = MindMapModel.addSiblingNode(cur, refKey, dir, side);
    if (!res) {
      return;
    }
    this.setState({
      graph: res.graph,
      selectedKeys: [],
      editingKey: res.id,
      activeKey: res.id,
    });
    this.editingSessionKey = res.id;
    return res.id;
  };

  /**
   * 通过历史命令新增兄弟节点（用于撤销/重做）。
   *
   * @param refKey 参照节点 key
   * @param dir 插入方向：-1 前置；1 后置
   * @param side 可选偏好侧
   * @returns void
   */
  private onAddSibling = (refKey: string, dir: -1 | 1, side?: Side): void => {
    const vp = this.getViewport();
    if (vp) {
      vp.historyManager.execute(new AddSiblingNodeCommand(vp, refKey, dir, side));
    }
  };

  /**
   * 在参照节点下新增子节点，并将其设为激活/编辑。
   *
   * @param refKey 父节点 key
   * @param side 新节点偏好侧
   * @returns 新节点 key
   */
  private handleAddChildNode = (refKey: string, side: Side): string | void => {
    const cur = (this.state as SceneState).graph;
    const res = MindMapModel.addChildNode(cur, refKey, side);
    this.setState({
      graph: res.graph,
      selectedKeys: [],
      editingKey: res.id,
      activeKey: res.id,
    });
    this.editingSessionKey = res.id;
    return res.id;
  };

  /**
   * 通过历史命令新增子节点（用于撤销/重做）。
   *
   * @param refKey 父节点 key
   * @param side 新节点偏好侧
   * @returns void
   */
  private onAddChildSide = (refKey: string, side: Side): void => {
    const vp = this.getViewport();
    if (vp) {
      vp.historyManager.execute(new AddChildNodeCommand(vp, refKey, side));
    }
  };

  /**
   * 以“最小更新”的方式移动某个节点的渲染偏移（用于拖拽交互）。
   *
   * @param key 节点 key
   * @param dx 目标偏移 X
   * @param dy 目标偏移 Y
   * @returns void
   */
  private onMoveNode = (key: string, dx: number, dy: number): void => {
    const rt = this.runtime;
    if (!rt) {
      return;
    }
    const rtx = rt as Runtime;
    const root = typeof rtx.getRootWidget === 'function' ? rtx.getRootWidget() : null;
    const target = findWidget(root, `#${key}`) as Widget | null;
    if (!target) {
      return;
    }
    let wrapper = null;
    if (target.type === CustomComponentType.MindMapNodeToolbar) {
      wrapper = target;
    } else if (target.type === CustomComponentType.MindMapNode) {
      const p = target.parent;
      if (p && p.type === CustomComponentType.MindMapNodeToolbar) {
        wrapper = p;
      } else {
        wrapper = target;
      }
    } else {
      wrapper = target;
    }
    if (wrapper) {
      wrapper.renderObject.offset = { dx, dy };
      wrapper.markDirty();
    }
  };

  /**
   * 将当前 GraphState 渲染为节点与连线，并对不变节点进行实例复用。
   *
   * @param state 图状态
   * @param handlers 交互回调集合
   * @param theme 主题（可选）
   * @returns 包含 elements 与 toolbar 的渲染结果
   */
  private renderGraphCached(
    state: GraphState,
    handlers: {
      onActive: (key: string | null) => void;
      onMoveNode: (key: string, dx: number, dy: number) => void;
      onAddSibling: (refKey: string, dir: -1 | 1, side?: Side) => void;
      onAddChildSide: (refKey: string, side: Side) => void;
      onEdit: (key: string | null, value?: string) => void;
      getViewState: () => { scale: number; tx: number; ty: number };
    },
    theme?: ThemePalette,
  ) {
    const ids = new Set<string>();
    const hasParent = new Set<string>();
    for (const e of state.edges) {
      hasParent.add(e.to);
    }

    for (const id of state.nodes.keys()) {
      ids.add(id);
    }
    for (const k of Array.from(this.nodePropsCache.keys())) {
      if (!ids.has(k)) {
        this.nodePropsCache.delete(k);
        this.nodeElementCache.delete(k);
      }
    }
    const edgeKeys = new Set<string>();
    for (const e of state.edges) {
      edgeKeys.add(`e-${e.from}-${e.to}`);
    }
    for (const k of Array.from(this.edgeElementCache.keys())) {
      if (!edgeKeys.has(k)) {
        this.edgeElementCache.delete(k);
      }
    }
    const nodes: MindMapNode[] = [];
    const activeKey = (this.state as SceneState).activeKey;
    for (const [id, n] of state.nodes.entries()) {
      const props = {
        title: n.title,
        prefSide: n.prefSide,
        activeKey: activeKey,
        active: activeKey === id,
        isEditing: (this.state as SceneState).editingKey === id,
        isRoot: !hasParent.has(id),
        theme,
      };
      const prev = this.nodePropsCache.get(id);
      let el = this.nodeElementCache.get(id);
      const changed =
        !prev ||
        prev.title !== props.title ||
        prev.prefSide !== props.prefSide ||
        prev.activeKey !== props.activeKey ||
        prev.active !== props.active ||
        prev.isEditing !== props.isEditing ||
        prev.isRoot !== props.isRoot ||
        prev.theme !== props.theme;
      if (changed) {
        el = (
          <MindMapNode
            key={id}
            title={n.title}
            activeKey={activeKey}
            active={activeKey === id}
            isEditing={props.isEditing}
            isRoot={props.isRoot}
            prefSide={n.prefSide}
            enableLayer={true}
            cursor="pointer"
            onActive={handlers.onActive}
            onMoveNode={handlers.onMoveNode}
            onEdit={handlers.onEdit}
            getViewState={handlers.getViewState}
            theme={theme}
          />
        );
        this.nodePropsCache.set(id, props);
        this.nodeElementCache.set(id, el!);
      }
      nodes.push(el!);
    }
    const edges: Connector[] = [];
    for (const e of state.edges) {
      const k = `e-${e.from}-${e.to}`;
      let el = this.edgeElementCache.get(k) as unknown as Connector | null;
      const connectorColor = theme ? theme.text.secondary : '#4a90e2';
      if (!el || el.props.color !== connectorColor) {
        el = (
          <Connector
            key={k}
            fromKey={e.from}
            toKey={e.to}
            style={ConnectorStyle.Elbow}
            strokeWidth={2}
            color={connectorColor}
            dashArray="5,3"
          />
        );
        this.edgeElementCache.set(k, el!);
      }
      edges.push(el!);
    }
    const toolbar = (
      <MindMapNodeToolbar
        key="toolbar"
        cursor="pointer"
        onAddSibling={handlers.onAddSibling}
        onAddChildSide={handlers.onAddChildSide}
        activeKey={activeKey}
        theme={theme}
      />
    );
    return { elements: [...nodes, ...edges], toolbar };
  }

  /**
   * 布局回调：在 MindMapLayout 完成布局后触发。
   *
   * - 通知控制器布局变更（用于缩略图等订阅方刷新）
   * - 可选地将视图居中一次（首次加载或 setGraphData 后）
   * - 同步编辑器覆盖层位置，避免滚动/缩放/布局导致错位
   *
   * @param size 布局内容尺寸
   * @returns void
   */
  private onLayout = (size: { width: number; height: number }) => {
    // 通知 Controller 布局更新
    if (this.runtime) {
      // 动态导入避免循环依赖，或使用全局/WeakMap查找
    }

    // 尝试获取 Controller 并通知
    // @ts-expect-error 运行时扩展
    const ctrl = this.runtime.__mindmapController;
    if (ctrl && typeof ctrl.dispatchLayoutChange === 'function') {
      ctrl.dispatchLayoutChange();
    }

    const vp = this.getViewport();
    if (!vp) {
      return;
    }
    if (this.shouldCenter) {
      const { width, height } = this.props as SceneProps;
      const vw = width ?? 800;
      const vh = height ?? 600;
      const tx = (vw - size.width) / 2;
      const ty = (vh - size.height) / 2;
      vp.scrollTo(-tx, -ty);
      this.shouldCenter = false;
    }
    this.scheduleSyncEditorRect();
  };

  /**
   * 用外部数据重建图状态（例如导入、服务端下发）。
   *
   * @param data 图数据（nodes/edges/activeKey）
   * @returns void
   */
  public setGraphData(data: {
    nodes: Array<{ key: string; title: string; parent?: string }>;
    edges: Array<{ from: string; to: string }>;
    activeKey?: string | null;
  }) {
    const cur = (this.state as SceneState).graph;
    const newState = MindMapModel.fromGraphData(cur, data);

    this.setState({ graph: newState, activeKey: data.activeKey ?? null });

    // 重置视图位置到中心？或者保持不变？
    // 应该让 Viewport 重新布局
    this.shouldCenter = true;
  }

  private shouldCenter = true;

  /**
   * 视口视图变更回调：同步本地 viewState，并转发给控制器。
   *
   * @param view 视图状态（缩放与平移）
   * @returns void
   */
  private onViewChange = (view: { scale: number; tx: number; ty: number }): void => {
    this.setState({
      ...this.state,
      viewState: view,
    });
    // 同步视图状态到控制器
    // @ts-expect-error 运行时扩展
    const ctrl = this.runtime?.__mindmapController;
    if (ctrl && typeof ctrl.syncView === 'function') {
      ctrl.syncView(view);

      // 尝试更新控制器的 Viewport 引用，确保 ZoomBar 等交互能操作到最新的 Viewport
      const vp = this.getViewport();
      if (vp && typeof ctrl.bindViewport === 'function') {
        ctrl.bindViewport(vp);
      }
    }
    this.scheduleSyncEditorRect();
  };

  /**
   * 激活节点变更回调：同步 activeKey，并在清空激活时退出编辑态。
   *
   * @param key 激活节点 key；传 null 表示清空
   * @returns void
   */
  private onActiveKeyChange = (key: string | null): void => {
    const activeKey = (this.state as SceneState).activeKey;
    if (activeKey === key) {
      return;
    }
    const nextState: Partial<SceneState> = {
      activeKey: key,
    };
    // 当激活节点被清除时，同时清除编辑状态
    if (!key) {
      nextState.editingKey = null;
      nextState.editorRect = null;
    }
    this.setState({
      ...this.state,
      ...nextState,
    });
  };

  /**
   * 计算编辑器覆盖层在 DOM 中的绝对矩形。
   *
   * 实现思路：
   * - 当节点存在非平凡世界矩阵时：用世界矩阵将节点四个角点变换到屏幕空间并取包围盒
   * - 当矩阵为单位矩阵时：走快速路径，基于 Viewport 的 tx/ty/scale 与相对位置计算
   *
   * @param targetKey 目标节点 key
   * @returns 目标节点的屏幕矩形；不可用时返回 null
   */
  private computeEditorRect(targetKey: string): MindMapEditorRect | null {
    const rt = this.runtime;
    if (!rt) {
      return null;
    }
    const root = (rt as Runtime).getRootWidget?.() ?? null;
    const target = root ? (findWidget(root, `#${targetKey}`) as Widget | null) : null;
    if (!target) {
      return null;
    }
    const w = target.renderObject.size.width;
    const h = target.renderObject.size.height;
    if (w <= 0 || h <= 0) {
      return null;
    }
    const m = target.getWorldMatrix();
    const identity =
      m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;

    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    if (!identity) {
      const p0 = transformPoint(m, { x: 0, y: 0 });
      const p1 = transformPoint(m, { x: w, y: 0 });
      const p2 = transformPoint(m, { x: 0, y: h });
      const p3 = transformPoint(m, { x: w, y: h });
      minX = Math.min(p0.x, p1.x, p2.x, p3.x);
      maxX = Math.max(p0.x, p1.x, p2.x, p3.x);
      minY = Math.min(p0.y, p1.y, p2.y, p3.y);
      maxY = Math.max(p0.y, p1.y, p2.y, p3.y);
    } else {
      const vp = this.getViewport();
      const view = (this.state as SceneState).viewState;
      const vpPos = vp ? vp.getAbsolutePosition() : { dx: 0, dy: 0 };
      const nodePos = target.getAbsolutePosition();
      const relX = nodePos.dx - vpPos.dx;
      const relY = nodePos.dy - vpPos.dy;
      const left = vpPos.dx + view.tx + relX * view.scale;
      const top = vpPos.dy + view.ty + relY * view.scale;
      minX = left;
      minY = top;
      maxX = left + w * view.scale;
      maxY = top + h * view.scale;
    }
    const round1 = (v: number) => Math.round(v * 10) / 10;
    const left = round1(minX);
    const top = round1(minY);
    const width = Math.max(0, round1(maxX - minX));
    const height = Math.max(0, round1(maxY - minY));
    if (width <= 0 || height <= 0) {
      return null;
    }
    return { left, top, width, height };
  }

  /**
   * 调度下一帧同步编辑器覆盖层矩形，避免滚动/缩放/布局时出现跳动。
   *
   * @returns void
   */
  private scheduleSyncEditorRect(): void {
    const key = (this.state as SceneState).editingKey;
    if (!key) {
      return;
    }
    if (this.editorRectRaf != null) {
      return;
    }
    this.editorRectRaf = requestAnimationFrame(() => {
      this.editorRectRaf = null;
      const curKey = (this.state as SceneState).editingKey;
      if (!curKey) {
        return;
      }
      const nextRect = this.computeEditorRect(curKey);
      const prev = (this.state as SceneState).editorRect;
      const same =
        (!!prev &&
          !!nextRect &&
          prev.left === nextRect.left &&
          prev.top === nextRect.top &&
          prev.width === nextRect.width &&
          prev.height === nextRect.height) ||
        (!prev && !nextRect);
      if (!same) {
        this.setState({ editorRect: nextRect });
      }
    });
  }

  render() {
    const s = (this.state as SceneState).graph;
    const view = (this.state as SceneState).viewState;
    const width = (this.props as SceneProps).width ?? 800;
    const height = (this.props as SceneProps).height ?? 600;
    const theme = (this.props as SceneProps).theme;
    const { elements, toolbar } = this.renderGraphCached(
      s,
      {
        onActive: (key) => this.onActive(key),
        onMoveNode: (key, dx, dy) => this.onMoveNode(key, dx, dy),
        onAddSibling: (refKey, dir, side) => this.onAddSibling(refKey, dir, side),
        onAddChildSide: (refKey, side) => this.onAddChildSide(refKey, side),
        onEdit: (key, value) => this.onEdit(key, value),
        getViewState: () => this.state.viewState,
      },
      theme,
    );
    return (
      <Stack>
        <MindMapViewport
          key={CustomComponentType.MindMapViewport}
          width={width}
          height={height}
          theme={theme ? theme : undefined}
          scale={view.scale}
          tx={view.tx}
          ty={view.ty}
          activeKey={this.state.activeKey}
          selectedKeys={this.state.selectedKeys}
          editingKey={this.state.editingKey}
          onScroll={this.onScroll}
          onViewChange={this.onViewChange}
          onActiveKeyChange={this.onActiveKeyChange}
          onZoomAt={this.onZoomAt}
          onDeleteSelection={this.onDeleteSelection}
          onRestoreSelection={this.onRestoreSelection}
          onSetSelectedKeys={this.onSetSelectedKeys}
          onEditingKeyChange={this.onEditingKeyChange}
          onAddSiblingNode={this.handleAddSiblingNode}
          onAddChildNode={this.handleAddChildNode}
        >
          <MindMapLayout
            key="layout-root"
            layout="treeBalanced"
            spacingX={48}
            spacingY={48}
            version={s.version}
            onLayout={this.onLayout}
          >
            {toolbar}
            {elements}
          </MindMapLayout>
        </MindMapViewport>

        <MindMapEditorOverlay
          key="mindmap-editor-overlay"
          targetKey={this.state.editingKey}
          rect={this.state.editorRect}
          value={this.state.editingKey ? (s.nodes.get(this.state.editingKey)?.title ?? '') : ''}
          scale={view.scale}
          theme={theme}
          onCommit={this.commitEditing}
          onCancel={this.cancelEditing}
        />
      </Stack>
    );
  }
}

export function runApp(
  runtime: Runtime,
  width: number,
  height: number,
  theme?: ThemePalette,
): void {
  runtime.render(<MindmapDemo width={width} height={height} theme={theme} />);
}
