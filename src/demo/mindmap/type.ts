export const CustomComponentType = {
  MindMapViewport: 'MindMapViewport',
  MindMapNode: 'MindMapNode',
  MindMapLayout: 'MindMapLayout',
  Connector: 'Connector',
  MindMapNodeToolbar: 'MindMapNodeToolbar',
} as const;

export const enum Side {
  Left = 'left',
  Right = 'right',
}

// 来自 types.ts
export type NodeId = string;

export interface GraphNode {
  id: NodeId;
  title: string;
  prefSide?: Side;
}

export interface GraphEdge {
  from: NodeId;
  to: NodeId;
}

export interface SelectionData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphState {
  nodes: Map<NodeId, GraphNode>;
  edges: GraphEdge[];
  version: number;
  nextId: number;
}
