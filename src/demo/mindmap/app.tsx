/** @jsxImportSource @/utils/compiler */
import { ConnectorStyle } from './helpers/connection-drawer';
import { AddChildNodeCommand, AddSiblingNodeCommand } from './helpers/shortcut/commands/edit';
import { findParent, makeInitialState } from './helpers/state-helper';
import { CustomComponentType, Side } from './type';
import { Connector } from './widgets/connector';
import { MindMapLayout } from './widgets/mindmap-layout';
import { MindMapNode } from './widgets/mindmap-node';
import { MindMapNodeToolbar } from './widgets/mindmap-node-toolbar';
import { MindMapViewport } from './widgets/mindmap-viewport';

import type { GraphEdge, GraphNode, GraphState, NodeId, SelectionData } from './type';
import type { MindMapViewport as MindMapViewportCls } from './widgets/mindmap-viewport';
import type { Widget, WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';
import type { ThemePalette } from '@/styles/theme';

import { StatefulWidget } from '@/core';
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

  constructor(data: SceneProps) {
    super(data);
    this.state = {
      graph: makeInitialState(),
      viewState: { scale: 1, tx: 0, ty: 0 },
      selectedKeys: [],
      editingKey: null,
      activeKey: null,
    };
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
  };

  // onRenderComplete 移除：统一由基类调度下一 Tick

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
    const childrenMap = new Map<string, string[]>();
    for (const e of cur.edges) {
      const arr = childrenMap.get(e.from) || [];
      arr.push(e.to);
      childrenMap.set(e.from, arr);
    }
    const toDelete = new Set<string>();
    const dfs = (k: string) => {
      toDelete.add(k);
      const arr = childrenMap.get(k) || [];
      for (const c of arr) {
        if (!toDelete.has(c)) {
          dfs(c);
        }
      }
    };
    for (const k of keys) {
      if (!toDelete.has(k)) {
        dfs(k);
      }
    }

    // 收集被删除的数据
    const deletedNodes: GraphNode[] = [];
    const nextNodes = new Map(cur.nodes);
    for (const k of Array.from(toDelete)) {
      const node = nextNodes.get(k);
      if (node) {
        deletedNodes.push(node);
        nextNodes.delete(k);
      }
    }

    const deletedEdges: GraphEdge[] = [];
    const nextEdges: GraphEdge[] = [];
    for (const e of cur.edges) {
      if (toDelete.has(e.from) || toDelete.has(e.to)) {
        deletedEdges.push(e);
      } else {
        nextEdges.push(e);
      }
    }

    const next: GraphState = {
      ...cur,
      nodes: nextNodes,
      edges: nextEdges,
      version: cur.version + 1,
      nextId: cur.nextId,
    };
    this.setState({ graph: next, activeKey: null });

    return {
      nodes: deletedNodes,
      edges: deletedEdges,
    };
  };

  private onRestoreSelection = (data: SelectionData): void => {
    if (!data || !data.nodes || !data.edges) {
      return;
    }
    const cur = (this.state as SceneState).graph;
    const nextNodes = new Map(cur.nodes);
    for (const node of data.nodes) {
      nextNodes.set(node.id, node);
    }
    const nextEdges = [...cur.edges, ...data.edges];

    // 简单的去重（针对 edge）
    // 实际场景中可能需要更复杂的合并逻辑

    const next: GraphState = {
      ...cur,
      nodes: nextNodes,
      edges: nextEdges,
      version: cur.version + 1,
      nextId: cur.nextId,
    };
    this.setState({ graph: next });
  };

  private onSetSelectedKeys = (keys: string[]): void => {
    this.setState({
      selectedKeys: keys,
    });
  };

  private onEditingKeyChange = (key: string | null): void => {
    this.setState({
      editingKey: key,
    });
  };

  private onActive = (key: string | null): void => {
    const cur = (this.state as SceneState).graph;
    const next: GraphState = { ...cur, version: cur.version + 1 };

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
      activeKey: key ?? null,
    });
  };

  onKeyDown(e: InkwellEvent): boolean | void {
    const vp = this.getViewport();
    if (vp) {
      return vp.onKeyDown(e);
    }
  }

  private handleAddSiblingNode = (refKey: string, dir: -1 | 1, side?: Side): string | void => {
    const cur = (this.state as SceneState).graph;
    const parent = findParent(cur, refKey);
    if (!parent) {
      return;
    }
    const title = '';
    const id = `n${cur.nextId}`;
    const nextId = cur.nextId + 1;

    const refEdgeIndex = cur.edges.findIndex((e) => e.from === parent && e.to === refKey);
    let nextEdges: GraphEdge[];
    const newEdge: GraphEdge = { from: parent, to: id };

    if (refEdgeIndex !== -1) {
      if (dir === -1) {
        nextEdges = [
          ...cur.edges.slice(0, refEdgeIndex),
          newEdge,
          ...cur.edges.slice(refEdgeIndex),
        ];
      } else {
        nextEdges = [
          ...cur.edges.slice(0, refEdgeIndex + 1),
          newEdge,
          ...cur.edges.slice(refEdgeIndex + 1),
        ];
      }
    } else {
      nextEdges = [...cur.edges, newEdge];
    }

    const newNode: GraphNode = { id, title };
    if (side) {
      newNode.prefSide = side;
    }

    const next: GraphState = {
      ...cur,
      nextId,
      nodes: new Map(cur.nodes).set(id, newNode),
      edges: nextEdges,
      version: cur.version + 1,
    };
    this.setState({
      graph: next,
      selectedKeys: [],
      editingKey: id,
      activeKey: id,
    });
    return id;
  };

  private onAddSibling = (refKey: string, dir: -1 | 1, side?: Side): void => {
    const vp = this.getViewport();
    if (vp) {
      vp.historyManager.execute(new AddSiblingNodeCommand(vp, refKey, dir, side));
    }
  };

  private handleAddChildNode = (refKey: string, side: Side): string | void => {
    const cur = (this.state as SceneState).graph;
    const title = '';
    const id = `n${cur.nextId}`;
    const nextId = cur.nextId + 1;
    const next: GraphState = {
      ...cur,
      nextId,
      nodes: new Map(cur.nodes).set(id, { id, title, prefSide: side }),
      edges: [...cur.edges, { from: refKey, to: id }],
      version: cur.version + 1,
    };
    this.setState({
      graph: next,
      selectedKeys: [],
      editingKey: id,
      activeKey: id,
    });
    return id;
  };

  private onAddChildSide = (refKey: string, side: Side): void => {
    const vp = this.getViewport();
    if (vp) {
      vp.historyManager.execute(new AddChildNodeCommand(vp, refKey, side));
    }
  };

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

  private renderGraphCached(
    state: GraphState,
    handlers: {
      onActive: (key: string | null) => void;
      onMoveNode: (key: string, dx: number, dy: number) => void;
      onAddSibling: (refKey: string, dir: -1 | 1, side?: Side) => void;
      onAddChildSide: (refKey: string, side: Side) => void;
      onEdit: (key: string | null) => void;
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
  };

  public setGraphData(data: {
    nodes: Array<{ key: string; title: string; parent?: string }>;
    edges: Array<{ from: string; to: string }>;
    activeKey?: string | null;
  }) {
    const nodes = new Map<string, GraphNode>();
    let maxId = 0;

    data.nodes.forEach((n) => {
      nodes.set(n.key, { id: n.key, title: n.title });
      // 尝试解析 ID 中的数字以更新 nextId
      const match = n.key.match(/\d+$/);
      if (match) {
        const idNum = parseInt(match[0], 10);
        if (!isNaN(idNum) && idNum > maxId) {
          maxId = idNum;
        }
      }
    });

    const nextId = maxId > 0 ? maxId + 1 : 1000;

    const newState: GraphState = {
      nodes,
      edges: data.edges,
      version: (this.state as SceneState).graph.version + 1,
      nextId,
    };

    this.setState({ graph: newState, activeKey: data.activeKey ?? null });

    // 重置视图位置到中心？或者保持不变？
    // 应该让 Viewport 重新布局
    this.shouldCenter = true;
  }

  private shouldCenter = true;

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
  };

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
    }
    this.setState({
      ...this.state,
      ...nextState,
    });
  };

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
        onEdit: (key) => this.onEditingKeyChange(key),
        getViewState: () => this.state.viewState,
      },
      theme,
    );
    return (
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
