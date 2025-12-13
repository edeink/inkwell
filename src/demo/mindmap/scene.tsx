/** @jsxImportSource @/utils/compiler */
import { Connector } from './custom-widget/connector';
import { MindMapLayout } from './custom-widget/mindmap-layout';
import { MindMapNode } from './custom-widget/mindmap-node';
import { MindMapNodeToolbar } from './custom-widget/mindmap-node-toolbar';
import { Side } from './custom-widget/type';
import { Viewport } from './custom-widget/viewport';
import { ConnectorStyle } from './helpers/connection-drawer';

import type { Viewport as ViewportCls } from './custom-widget/viewport';
import type { WidgetProps } from '@/core/base';
import type Runtime from '@/runtime';
import type { JSXElement } from '@/utils/compiler/jsx-runtime';

import { Widget } from '@/core';
import { StatefulWidget } from '@/core/state/stateful';

type NodeId = string;
type GraphNode = {
  id: NodeId;
  title: string;
  prefSide?: Side;
};
type GraphEdge = { from: NodeId; to: NodeId };
type GraphState = {
  nodes: Map<NodeId, GraphNode>;
  edges: GraphEdge[];
  activeKey: NodeId | null;
  version: number;
  nextId: number;
};
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
type SceneState = { graph: GraphState };

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
  private nodeElementCache: Map<NodeId, JSXElement> = new Map();
  private edgeElementCache: Map<string, JSXElement> = new Map();

  constructor(data: SceneProps) {
    super(data);
    this.state = { graph: makeInitialState() };
  }

  private findByKey(w: Widget | null, key: string): Widget | null {
    if (!w) {
      return null;
    }
    if (w.key === key) {
      return w;
    }
    for (const c of w.children) {
      const r = this.findByKey(c as Widget, key);
      if (r) {
        return r;
      }
    }
    return null;
  }

  private getViewport(): ViewportCls | null {
    const rt = this.resolveRuntime();
    if (!rt) {
      return null;
    }
    const root = rt.getRootWidget();
    return this.findByKey(root, 'v') as ViewportCls | null;
  }

  private onSetViewPosition = (tx: number, ty: number): void => {
    const vp = this.getViewport();
    if (!vp) {
      return;
    }
    vp.setPosition(tx, ty);
    vp.markNeedsLayout();
  };

  private onZoomAt = (scale: number, cx: number, cy: number): void => {
    const vp = this.getViewport();
    if (!vp) {
      return;
    }
    vp.zoomAt(scale, cx, cy);
    vp.markNeedsLayout();
  };

  private onRenderComplete = (): void => {
    const vp = this.getViewport();
    if (!vp) {
      return;
    }
    vp.markNeedsLayout();
  };

  private onDeleteSelection = (): void => {
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
    const nextNodes = new Map(cur.nodes);
    for (const k of Array.from(toDelete)) {
      nextNodes.delete(k);
    }
    const nextEdges = cur.edges.filter((e) => !toDelete.has(e.from) && !toDelete.has(e.to));
    const next: GraphState = {
      ...cur,
      nodes: nextNodes,
      edges: nextEdges,
      activeKey: null,
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

  private onAddSibling = (refKey: string, _dir: -1 | 1): void => {
    const cur = (this.state as SceneState).graph;
    const parent = findParent(cur, refKey);
    if (!parent) {
      return;
    }
    const id = `n${cur.nextId}`;
    const nextId = cur.nextId + 1;
    const nextEdges: GraphEdge[] = [...cur.edges, { from: parent, to: id }];
    const next: GraphState = {
      ...cur,
      nextId,
      nodes: new Map(cur.nodes).set(id, { id, title: '新节点' }),
      edges: nextEdges,
      version: cur.version + 1,
    };
    this.setState({ graph: next });
    this.onActive(id);
  };

  private onAddChildSide = (refKey: string, side: Side): void => {
    const cur = (this.state as SceneState).graph;
    const id = `n${cur.nextId}`;
    const nextId = cur.nextId + 1;
    const next: GraphState = {
      ...cur,
      nextId,
      nodes: new Map(cur.nodes).set(id, { id, title: '新节点', prefSide: side }),
      edges: [...cur.edges, { from: refKey, to: id }],
      version: cur.version + 1,
    };
    this.setState({ graph: next });
  };

  private onMoveNode = (key: string, dx: number, dy: number): void => {
    const rt = this.resolveRuntime();
    if (!rt) {
      return;
    }
    const root = rt.getRootWidget();
    const target = this.findByKey(root, key);
    if (!target) {
      return;
    }
    let wrapper = null;
    if (target.type === 'MindMapNodeToolbar') {
      wrapper = target;
    } else if (target.type === 'MindMapNode') {
      const p = target.parent;
      if (p && p.type === 'MindMapNodeToolbar') {
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
    const nodes: JSXElement[] = [];
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
            onActive={handlers.onActive}
            onMoveNode={handlers.onMoveNode}
          />
        ) as unknown as JSXElement;
        this.nodePropsCache.set(id, props);
        this.nodeElementCache.set(id, el!);
      }
      nodes.push(el!);
    }
    const edges: JSXElement[] = [];
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
        onAddSibling={handlers.onAddSibling}
        onAddChildSide={handlers.onAddChildSide}
        activeKey={state.activeKey}
      />
    );
    return [...nodes, ...edges, toolbar];
  }

  render() {
    const s = (this.state as SceneState).graph;
    const width = (this.props as SceneProps).width ?? 800;
    const height = (this.props as SceneProps).height ?? 600;
    const children = this.renderGraphCached(s, {
      onActive: this.onActive,
      onMoveNode: this.onMoveNode,
      onAddSibling: this.onAddSibling,
      onAddChildSide: this.onAddChildSide,
    });
    return (
      <Viewport
        key="v"
        scale={1}
        tx={0}
        ty={0}
        width={width}
        height={height}
        onSetViewPosition={this.onSetViewPosition}
        onZoomAt={this.onZoomAt}
        onRenderComplete={this.onRenderComplete}
        onDeleteSelection={this.onDeleteSelection}
        onSetSelectedKeys={this.onSetSelectedKeys}
      >
        <MindMapLayout
          key="layout-root"
          layout="treeBalanced"
          spacingX={48}
          spacingY={48}
          version={s.version}
        >
          {children}
        </MindMapLayout>
      </Viewport>
    );
  }
}

export function runApp(runtime: Runtime, size: { width: number; height: number }) {
  runtime.render(<Scene width={size.width} height={size.height} />);
}
