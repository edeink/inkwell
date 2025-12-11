/** @jsxImportSource @/utils/compiler */
import { MindmapController } from './controller/index';
import { ConnectorElement as Connector } from './custom-widget/connector';
import { MindMapLayoutElement as MindMapLayout } from './custom-widget/mindmap-layout';
import { MindMapNodeElement as MindMapNode } from './custom-widget/mindmap-node';
import { MindMapNodeToolbarElement as MindMapNodeToolbar } from './custom-widget/mindmap-node-toolbar';
import { Side } from './custom-widget/type';
import { ViewportElement as Viewport } from './custom-widget/viewport';

import type Runtime from '@/runtime';
import type { ComponentData } from '@/runtime';
import type { JSXElement } from '@/utils/compiler/jsx-runtime';

import { compileTemplate } from '@/utils/compiler/jsx-compiler';

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

function newNodeId(state: GraphState): NodeId {
  const id = `n${state.nextId}`;
  state.nextId += 1;
  return id;
}

/**
 * 创建 Mindmap 场景
 * @param width 视口宽度（像素）
 * @param height 视口高度（像素）
 * @returns 场景 JSX 元素，用于 Runtime.renderFromJSX
 * @example
 * const scene = createScene(800, 600)
 * await runtime.renderFromJSX(scene)
 */
export function createScene(width: number, height: number, runtime?: Runtime) {
  let state: GraphState = makeInitialState();
  const nodePropsCache = new Map<
    NodeId,
    { title: string; prefSide?: Side; activeKey: NodeId | null; active: boolean }
  >();
  const nodeElementCache = new Map<NodeId, JSXElement>();
  const edgeElementCache = new Map<string, JSXElement>();
  const getController = (): MindmapController | null => {
    try {
      if (!runtime) {
        return null;
      }
      return MindmapController.getByRuntime(runtime);
    } catch {
      return null;
    }
  };

  const findByKey = (w: any, key: string): any => {
    if (!w) {
      return null;
    }
    if (w.key === key) {
      return w;
    }
    for (const c of w.children) {
      const r = findByKey(c, key);
      if (r) {
        return r;
      }
    }
    return null;
  };
  const getViewport = (): any => {
    if (!runtime) {
      return null;
    }
    const root = runtime.getRootWidget();
    return findByKey(root, 'v');
  };

  const onSetViewPosition = (tx: number, ty: number): void => {
    try {
      const vp = getViewport();
      vp?.setPosition(tx, ty);
      runtime?.rerender();
    } catch (e) {
      console.error('Set view position failed:', e);
    }
  };
  const onZoomAt = (scale: number, cx: number, cy: number): void => {
    try {
      const vp = getViewport();
      vp?.zoomAt(scale, cx, cy);
      runtime?.rerender();
    } catch (e) {
      console.error('Zoom failed:', e);
    }
  };
  const onRenderComplete = (): void => {
    try {
      runtime?.rerender();
    } catch (e) {
      console.error('Render complete handler failed:', e);
    }
  };
  const onDeleteSelection = (): void => {
    try {
      const vp = getViewport();
      if (!vp) {
        return;
      }
      const keys: string[] = [];
      const active = state.activeKey;
      if (active) {
        keys.push(active);
      } else if (Array.isArray(vp.selectedKeys) && vp.selectedKeys.length) {
        keys.push(...vp.selectedKeys);
      }
      if (!keys.length) {
        return;
      }
      const childrenMap = new Map<string, string[]>();
      for (const e of state.edges) {
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
      const nextNodes = new Map(state.nodes);
      for (const k of Array.from(toDelete)) {
        nextNodes.delete(k);
      }
      const nextEdges = state.edges.filter((e) => !toDelete.has(e.from) && !toDelete.has(e.to));
      state = {
        ...state,
        nodes: nextNodes,
        edges: nextEdges,
        activeKey: null,
        version: state.version + 1,
      };
      updateUIFromState(state);
      runtime?.rerender();
    } catch (e) {
      console.error('Delete selection failed:', e);
    }
  };
  const onSetSelectedKeys = (keys: string[]): void => {
    try {
      const vp = getViewport();
      vp?.setSelectedKeys(keys);
      runtime?.rerender();
    } catch (e) {
      console.error('Set selected keys failed:', e);
    }
  };
  const onActive = (key: string | null): void => {
    try {
      state = { ...state, activeKey: key ?? null, version: state.version + 1 };
      const vp = getViewport();
      vp?.setActiveKey(key ?? null);
      updateUIFromState(state);
    } catch (e) {
      console.error('Set active key failed:', e);
    }
  };
  const onAddSibling = (refKey: string, dir: -1 | 1) => {
    try {
      const parent = findParent(state, refKey);
      if (!parent) {
        return;
      }
      const id = newNodeId(state);
      const nextEdges: GraphEdge[] = [];
      for (const e of state.edges) {
        nextEdges.push(e);
        if (e.from === parent && e.to === refKey && dir > 0) {
          nextEdges.push({ from: parent, to: id });
        }
        if (e.from === parent && e.to === refKey && dir < 0) {
          nextEdges.splice(nextEdges.length - 1, 0, { from: parent, to: id });
        }
      }
      if (!nextEdges.some((x) => x.to === id)) {
        nextEdges.push({ from: parent, to: id });
      }
      state = {
        ...state,
        nodes: new Map(state.nodes).set(id, { id, title: '新节点' }),
        edges: nextEdges,
        version: state.version + 1,
      };
      updateUIFromState(state);
    } catch (e) {
      console.error('Add sibling failed:', e);
    }
  };
  const onAddChildSide = (refKey: string, side: Side) => {
    try {
      const id = newNodeId(state);
      state = {
        ...state,
        nodes: new Map(state.nodes).set(id, { id, title: '新节点', prefSide: side }),
        edges: [...state.edges, { from: refKey, to: id }],
        version: state.version + 1,
      };
      updateUIFromState(state);
    } catch (e) {
      console.error('Add child side failed:', e);
    }
  };
  const onMoveNode = (key: string, dx: number, dy: number): void => {
    try {
      if (!runtime) {
        return;
      }
      const root = runtime.getRootWidget();
      const target = findByKey(root, key);
      if (!target) {
        return;
      }
      let wrapper: any = null;
      if (target.type === 'MindMapNodeToolbar') {
        wrapper = target;
      } else if (target.type === 'MindMapNode') {
        const p = target.parent as any;
        if (p && p.type === 'MindMapNodeToolbar') {
          wrapper = p;
        } else {
          wrapper = target;
        }
      } else {
        wrapper = target;
      }
      if (wrapper) {
        wrapper.renderObject.offset = { dx, dy } as any;
      }
      runtime.rerender();
    } catch (e) {
      console.error('Move node failed:', e);
    }
  };

  const updateUIFromState = (next: GraphState): void => {
    if (!runtime) {
      return;
    }
    try {
      const root = runtime.getRootWidget();
      const layout = findByKey(root, 'layout-root');
      if (!layout) {
        return;
      }
      const renderGraphCached = (
        state: GraphState,
        handlers: {
          onActive: (key: string | null) => void;
          onMoveNode: (key: string, dx: number, dy: number) => void;
          onAddSibling: (refKey: string, dir: -1 | 1) => void;
          onAddChildSide: (refKey: string, side: Side) => void;
        },
      ): JSXElement[] => {
        const ids = new Set<string>();
        for (const id of state.nodes.keys()) {
          ids.add(id);
        }
        for (const k of Array.from(nodePropsCache.keys())) {
          if (!ids.has(k)) {
            nodePropsCache.delete(k);
            nodeElementCache.delete(k);
          }
        }
        const edgeKeys = new Set<string>();
        for (const e of state.edges) {
          edgeKeys.add(`e-${e.from}-${e.to}`);
        }
        for (const k of Array.from(edgeElementCache.keys())) {
          if (!edgeKeys.has(k)) {
            edgeElementCache.delete(k);
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
          const prev = nodePropsCache.get(id);
          let el = nodeElementCache.get(id);
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
            nodePropsCache.set(id, props);
            nodeElementCache.set(id, el!);
          }
          nodes.push(el!);
        }
        const edges: JSXElement[] = [];
        for (const e of state.edges) {
          const k = `e-${e.from}-${e.to}`;
          let el = edgeElementCache.get(k);
          if (!el) {
            el = (
              <Connector
                key={k}
                fromKey={e.from}
                toKey={e.to}
                style="elbow"
                strokeWidth={2}
                color="#4a90e2"
                dashArray="5,3"
              />
            ) as unknown as JSXElement;
            edgeElementCache.set(k, el!);
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
        ) as unknown as JSXElement;
        return [...nodes, ...edges, toolbar];
      };
      const children = renderGraphCached(next, {
        onActive,
        onMoveNode,
        onAddSibling,
        onAddChildSide,
      });
      const json: ComponentData = compileTemplate(
        () =>
          (
            <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
              {children as any}
            </MindMapLayout>
          ) as unknown as JSXElement,
      );
      const nextData = {
        ...(layout.data ?? {}),
        nodeCount: next.nodes.size,
        edgeCount: next.edges.length,
        children: json.children ?? [],
      };
      layout.createElement(nextData);
      layout.markNeedsLayout();
    } catch (e) {
      console.error('Update UI from state failed:', e);
    }
  };

  const initialChildren: any = (() => {
    const s = state;
    const handlers = { onActive, onMoveNode, onAddSibling, onAddChildSide };
    const ids = new Set<string>();
    for (const id of s.nodes.keys()) {
      ids.add(id);
    }
    for (const k of Array.from(nodePropsCache.keys())) {
      if (!ids.has(k)) {
        nodePropsCache.delete(k);
        nodeElementCache.delete(k);
      }
    }
    const edgeKeys = new Set<string>();
    for (const e of s.edges) {
      edgeKeys.add(`e-${e.from}-${e.to}`);
    }
    for (const k of Array.from(edgeElementCache.keys())) {
      if (!edgeKeys.has(k)) {
        edgeElementCache.delete(k);
      }
    }
    return ((): JSXElement[] => {
      const nodes: JSXElement[] = [];
      for (const [id, n] of s.nodes.entries()) {
        const props = {
          title: n.title,
          prefSide: n.prefSide,
          activeKey: s.activeKey,
          active: s.activeKey === id,
        };
        const prev = nodePropsCache.get(id);
        let el = nodeElementCache.get(id);
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
              activeKey={s.activeKey}
              active={s.activeKey === id}
              prefSide={n.prefSide}
              onActive={handlers.onActive}
              onMoveNode={handlers.onMoveNode}
            />
          ) as unknown as JSXElement;
          nodePropsCache.set(id, props);
          nodeElementCache.set(id, el!);
        }
        nodes.push(el!);
      }
      const edges: JSXElement[] = [];
      for (const e of s.edges) {
        const k = `e-${e.from}-${e.to}`;
        let el = edgeElementCache.get(k);
        if (!el) {
          el = (
            <Connector
              key={k}
              fromKey={e.from}
              toKey={e.to}
              style="elbow"
              strokeWidth={2}
              color="#4a90e2"
              dashArray="5,3"
            />
          );
          edgeElementCache.set(k, el!);
        }
        edges.push(el!);
      }
      const toolbar = (
        <MindMapNodeToolbar
          key="toolbar"
          onAddSibling={handlers.onAddSibling}
          onAddChildSide={handlers.onAddChildSide}
          activeKey={s.activeKey}
        />
      );
      return [...nodes, ...edges, toolbar];
    })();
  })();

  return (
    <Viewport
      key="v"
      scale={1}
      tx={0}
      ty={0}
      width={width}
      height={height}
      onSetViewPosition={onSetViewPosition}
      onZoomAt={onZoomAt}
      onRenderComplete={onRenderComplete}
      onDeleteSelection={onDeleteSelection}
      onSetSelectedKeys={onSetSelectedKeys}
    >
      <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
        {initialChildren}
      </MindMapLayout>
    </Viewport>
  );
}
