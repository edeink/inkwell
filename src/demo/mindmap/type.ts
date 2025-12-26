// 来自 custom-widget/type.ts
export enum CustomComponentType {
  MindMapViewport = 'MindMapViewport',
  MindMapNode = 'MindMapNode',
  MindMapLayout = 'MindMapLayout',
  Connector = 'Connector',
  MindMapNodeToolbar = 'MindMapNodeToolbar',
}

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
  activeKey: NodeId | null;
  version: number;
  nextId: number;
}
