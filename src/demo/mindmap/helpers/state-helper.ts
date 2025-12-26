import type { GraphEdge, GraphNode, GraphState, NodeId } from '../type';

export function makeInitialState(): GraphState {
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

export function findParent(state: GraphState, childId: NodeId): NodeId | null {
  for (const e of state.edges) {
    if (e.to === childId) {
      return e.from;
    }
  }
  return null;
}
