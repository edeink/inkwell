import { Side } from './custom-widget/type';

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
