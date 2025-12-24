/** @jsxImportSource @/utils/compiler */
import { Connector } from './custom-widget/connector';
import { MindMapLayout } from './custom-widget/mindmap-layout';
import { MindMapNode } from './custom-widget/mindmap-node';
import { MindMapNodeToolbar } from './custom-widget/mindmap-node-toolbar';
import { MindMapViewport } from './custom-widget/mindmap-viewport';
import { CustomComponentType, Side } from './custom-widget/type';
import { ConnectorStyle } from './helpers/connection-drawer';

import type { MindMapViewport as MindMapViewportCls } from './custom-widget/mindmap-viewport';
import type { GraphEdge, GraphNode, GraphState, NodeId, SelectionData } from './types';
import type { WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';
import type Runtime from '@/runtime';

import { StatefulWidget, Widget } from '@/core';
import { findWidget } from '@/core/helper/widget-selector';

function makeInitialState(): GraphState {
  const nodes: GraphNode[] = [
    { id: 'root', title: '主题' },
    { id: 'n1', title: '分支 1' },
    { id: 'n1-1', title: '分支 1.1' },
    { id: 'n1-2', title: '分支 1.2' },
    { id: 'n2', title: '分支 2' },
    { id: 'n2-1', title: '分支 2.1' },
    { id: 'n3', title: '分支 3' },
    { id: 'n3-1', title: '分支 3.1' },
    { id: 'n3-1-1', title: '分支 3.1.1' },
    { id: 'n4', title: '分支 4' },
    { id: 'n4-1', title: '分支 4.1' },
    { id: 'n4-1-1', title: '分支 4.1.1' },
  ];
  const edges: GraphEdge[] = [
    { from: 'root', to: 'n1' },
    { from: 'root', to: 'n2' },
    { from: 'n1', to: 'n1-1' },
    { from: 'n1', to: 'n1-2' },
    { from: 'n2', to: 'n2-1' },
    { from: 'root', to: 'n3' },
    { from: 'n3', to: 'n3-1' },
    { from: 'n3-1', to: 'n3-1-1' },
    { from: 'root', to: 'n4' },
    { from: 'n4', to: 'n4-1' },
    { from: 'n4-1', to: 'n4-1-1' },
  ];
  const map = new Map(nodes.map((n) => [n.id, n] as const));
  return { nodes: map, edges, activeKey: null, version: 1, nextId: 1000 };
}

function findParent(state: GraphState, childId: NodeId): NodeId | null {
  for (const e of state.edges) {
    if (e.to === childId) {
      return e.from;
    }
  }
  return null;
}

interface SceneProps extends WidgetProps {
  width?: number;
  height?: number;
}
type SceneState = { graph: GraphState; viewState: { scale: number; tx: number; ty: number } };

/**
 * 创建 Mindmap 场景
 * @param width 视口宽度（像素）
 * @param height 视口高度（像素）
 */
export class Scene extends StatefulWidget<SceneProps, SceneState> {
  private nodePropsCache: Map<
    NodeId,
    { title: string; prefSide?: Side; activeKey: NodeId | null; active: boolean }
  > = new Map();
  private nodeElementCache: Map<NodeId, WidgetProps> = new Map();
  private edgeElementCache: Map<string, WidgetProps> = new Map();

  constructor(data: SceneProps) {
    super(data);
    this.state = {
      graph: makeInitialState(),
      viewState: { scale: 1, tx: 0, ty: 0 },
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

  private onScroll = (scrollX: number, scrollY: number): void => {
    // 通知 Controller 视图变更（因为 Viewport 内容偏移改变了）
    // @ts-expect-error runtime extension
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
    vp.markNeedsLayout();

    // 通知 Controller 视图变更
    // @ts-expect-error runtime extension
    const ctrl = this.runtime.__mindmapController;
    if (ctrl && typeof ctrl.notifyViewChange === 'function') {
      ctrl.notifyViewChange();
    }
  };

  // onRenderComplete 移除：统一由基类调度下一 Tick

  private onDeleteSelection = (): SelectionData | void => {
    const vp = this.getViewport();
    const cur = (this.state as SceneState).graph;
    if (!vp) {
      return;
    }
    const keys: string[] = [];
    const active = cur.activeKey;
    if (active) {
      keys.push(active);
    } else if (Array.isArray(vp.selectedKeys) && vp.selectedKeys.length) {
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
      activeKey: null,
      version: cur.version + 1,
    };
    this.setState({ graph: next });

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
    };
    this.setState({ graph: next });
  };

  private onSetSelectedKeys = (keys: string[]): void => {
    const vp = this.getViewport();
    if (!vp) {
      return;
    }
    vp.setSelectedKeys(keys);
    vp.markNeedsLayout();
  };

  private onActive = (key: string | null): void => {
    const vp = this.getViewport();
    const cur = (this.state as SceneState).graph;
    const next: GraphState = { ...cur, activeKey: key ?? null, version: cur.version + 1 };
    vp?.setActiveKey(key ?? null);
    this.setState({ graph: next });
  };

  onKeyDown(e: InkwellEvent): boolean | void {
    const vp = this.getViewport();
    if (vp) {
      return vp.onKeyDown(e);
    }
  }

  private onAddSibling = (refKey: string, dir: -1 | 1, side?: Side): void => {
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
    this.setState({ graph: next });
    this.onActive(id);

    // 自动进入编辑模式
    const vp = this.getViewport();
    if (vp) {
      vp.setEditingKey(id);
    }
  };

  private onAddChildSide = (refKey: string, side: Side): void => {
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
    this.setState({ graph: next });
    this.onActive(id);

    // 自动进入编辑模式
    const vp = this.getViewport();
    if (vp) {
      vp.setEditingKey(id);
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
      wrapper.markNeedsLayout();
    }
  };

  private renderGraphCached(
    state: GraphState,
    handlers: {
      onActive: (key: string | null) => void;
      onMoveNode: (key: string, dx: number, dy: number) => void;
      onAddSibling: (refKey: string, dir: -1 | 1) => void;
      onAddChildSide: (refKey: string, side: Side) => void;
    },
  ) {
    const ids = new Set<string>();
    // ... (keep existing logic)
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
    const nodes: WidgetProps[] = [];
    for (const [id, n] of state.nodes.entries()) {
      const props = {
        title: n.title,
        prefSide: n.prefSide,
        activeKey: state.activeKey,
        active: state.activeKey === id,
      };
      const prev = this.nodePropsCache.get(id);
      let el = this.nodeElementCache.get(id);
      const changed =
        !prev ||
        prev.title !== props.title ||
        prev.prefSide !== props.prefSide ||
        prev.activeKey !== props.activeKey ||
        prev.active !== props.active;
      if (changed) {
        el = (
          <MindMapNode
            key={id}
            title={n.title}
            activeKey={state.activeKey}
            active={state.activeKey === id}
            prefSide={n.prefSide}
            cursor="pointer"
            onActive={handlers.onActive}
            onMoveNode={handlers.onMoveNode}
          />
        );
        this.nodePropsCache.set(id, props);
        this.nodeElementCache.set(id, el!);
      }
      nodes.push(el!);
    }
    const edges: WidgetProps[] = [];
    for (const e of state.edges) {
      const k = `e-${e.from}-${e.to}`;
      let el = this.edgeElementCache.get(k);
      if (!el) {
        el = (
          <Connector
            key={k}
            fromKey={e.from}
            toKey={e.to}
            style={ConnectorStyle.Elbow}
            strokeWidth={2}
            color="#4a90e2"
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
        activeKey={state.activeKey}
      />
    );
    return { elements: [...nodes, ...edges], toolbar };
  }

  private onLayout = (size: { width: number; height: number }) => {
    // 通知 Controller 布局更新
    if (this.runtime) {
      // 动态导入避免循环依赖，或使用全局/WeakMap查找
      // 假设 MindmapController 挂在 Runtime 上或通过某种方式可访问
      // 这里我们使用自定义事件或者查找 Controller
      // 由于 Controller.byRuntime 是静态的，我们可以尝试访问
      // 但为了避免导入 Controller 类（可能导致循环依赖），我们这里先暂时不通过 Controller
      // 而是通过 dispatchEvent 发送事件？
      // 或者，Scene 不直接依赖 Controller。
      // 反过来，Controller 可以 hook into Scene？
      // 让我们看看 MindmapController 是否可以注册到 Runtime。
    }

    // 尝试获取 Controller 并通知
    // @ts-expect-error runtime extension
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
      vp.setContentPosition(tx, ty);
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
      activeKey: data.activeKey ?? null,
      version: (this.state as SceneState).graph.version + 1,
      nextId,
    };

    this.setState({ graph: newState });

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
  };

  private onActiveKeyChange = (key: string | null): void => {
    const s = (this.state as SceneState).graph;
    if (s.activeKey === key) {
      return;
    }
    this.setState({
      ...this.state,
      graph: { ...s, activeKey: key },
    });
  };

  render() {
    const s = (this.state as SceneState).graph;
    const view = (this.state as SceneState).viewState;
    const width = (this.props as SceneProps).width ?? 800;
    const height = (this.props as SceneProps).height ?? 600;
    const { elements, toolbar } = this.renderGraphCached(s, {
      onActive: this.onActive,
      onMoveNode: this.onMoveNode,
      onAddSibling: this.onAddSibling,
      onAddChildSide: this.onAddChildSide,
    });
    return (
      <MindMapViewport
        key={CustomComponentType.MindMapViewport}
        width={width}
        height={height}
        scale={view.scale}
        tx={view.tx}
        ty={view.ty}
        activeKey={s.activeKey}
        onScroll={this.onScroll}
        onViewChange={this.onViewChange}
        onActiveKeyChange={this.onActiveKeyChange}
        onZoomAt={this.onZoomAt}
        onDeleteSelection={this.onDeleteSelection}
        onRestoreSelection={this.onRestoreSelection}
        onSetSelectedKeys={this.onSetSelectedKeys}
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

export function runApp(runtime: Runtime, size: { width: number; height: number }) {
  runtime.render(<Scene width={size.width} height={size.height} />);
}
