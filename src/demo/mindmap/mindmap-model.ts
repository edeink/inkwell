import { findParent } from './helpers/state-helper';

import type { GraphEdge, GraphNode, GraphState, NodeId, SelectionData, Side } from './type';

/**
 * MindMapModel 负责对思维导图图数据（GraphState）做纯数据层的增删改查。
 *
 * 核心职责：
 * - 以不可变方式更新 nodes/edges，确保版本号递增，从而驱动视图刷新
 * - 提供面向业务语义的操作（改标题、增子节点/兄弟节点、删除子树、撤销恢复等）
 *
 * 设计约束：
 * - 不依赖任何渲染/布局细节；布局与样式保持由上层（如 MindMapLayout）决定
 * - 每次更新尽量只改动受影响的数据结构，遵守“最小惊讶”原则
 */
export class MindMapModel {
  /**
   * 触发一次“版本递增”的无副作用更新。
   *
   * 常用于需要强制刷新视图但数据结构不变的场景。
   *
   * @param graph 当前图状态
   * @returns 版本号递增后的图状态
   */
  public static touch(graph: GraphState): GraphState {
    return { ...graph, version: graph.version + 1 };
  }

  /**
   * 更新指定节点标题。
   *
   * - 若节点不存在，或标题未变化，则返回原 graph（避免无意义重绘）
   * - 否则复制 nodes Map 并更新对应节点，版本号递增
   *
   * @param graph 当前图状态
   * @param id 节点 ID
   * @param title 新标题
   * @returns 更新后的图状态
   */
  public static setNodeTitle(graph: GraphState, id: NodeId, title: string): GraphState {
    const node = graph.nodes.get(id);
    if (!node || node.title === title) {
      return graph;
    }
    const nextNodes = new Map(graph.nodes);
    nextNodes.set(id, { ...node, title });
    return { ...graph, nodes: nextNodes, version: graph.version + 1 };
  }

  /**
   * 在参照节点的同级位置新增一个兄弟节点。
   *
   * @param graph 当前图状态
   * @param refKey 参照节点 ID
   * @param dir 插入方向：-1 表示插入到 refKey 前；1 表示插入到 refKey 后
   * @param side 可选的偏好侧（仅影响新增节点的 prefSide 字段）
   * @returns 新的图状态与新增节点 ID；若找不到父节点则返回 null
   *
   * @example
   * ```ts
   * const res = MindMapModel.addSiblingNode(graph, 'n1', 1);
   * if (res) {
   *   graph = res.graph;
   *   console.log('新增节点:', res.id);
   * }
   * ```
   */
  public static addSiblingNode(
    graph: GraphState,
    refKey: NodeId,
    dir: -1 | 1,
    side?: Side,
  ): { graph: GraphState; id: NodeId } | null {
    const parent = findParent(graph, refKey);
    if (!parent) {
      return null;
    }
    const id = `n${graph.nextId}`;
    const nextId = graph.nextId + 1;

    const refEdgeIndex = graph.edges.findIndex((e) => e.from === parent && e.to === refKey);
    const newEdge: GraphEdge = { from: parent, to: id };
    let nextEdges: GraphEdge[];
    if (refEdgeIndex !== -1) {
      if (dir === -1) {
        nextEdges = [
          ...graph.edges.slice(0, refEdgeIndex),
          newEdge,
          ...graph.edges.slice(refEdgeIndex),
        ];
      } else {
        nextEdges = [
          ...graph.edges.slice(0, refEdgeIndex + 1),
          newEdge,
          ...graph.edges.slice(refEdgeIndex + 1),
        ];
      }
    } else {
      nextEdges = [...graph.edges, newEdge];
    }

    const newNode: GraphNode = side ? { id, title: '', prefSide: side } : { id, title: '' };
    const nextNodes = new Map(graph.nodes);
    nextNodes.set(id, newNode);

    return {
      id,
      graph: {
        ...graph,
        nextId,
        nodes: nextNodes,
        edges: nextEdges,
        version: graph.version + 1,
      },
    };
  }

  /**
   * 为参照节点新增一个子节点。
   *
   * @param graph 当前图状态
   * @param refKey 父节点 ID
   * @param side 新节点偏好侧
   * @returns 新的图状态与新增节点 ID
   */
  public static addChildNode(
    graph: GraphState,
    refKey: NodeId,
    side: Side,
  ): { graph: GraphState; id: NodeId } {
    const id = `n${graph.nextId}`;
    const nextId = graph.nextId + 1;
    const nextNodes = new Map(graph.nodes);
    nextNodes.set(id, { id, title: '', prefSide: side });
    const nextEdges = [...graph.edges, { from: refKey, to: id }];
    return {
      id,
      graph: { ...graph, nextId, nodes: nextNodes, edges: nextEdges, version: graph.version + 1 },
    };
  }

  /**
   * 删除若干节点对应的整棵子树（包含自身与所有后代）。
   *
   * @param graph 当前图状态
   * @param keys 待删除的节点 ID 列表
   * @returns 删除后的图状态，以及用于撤销恢复的 deleted 数据
   *
   * @example
   * ```ts
   * const { graph: next, deleted } = MindMapModel.deleteSubtrees(graph, ['n1']);
   * // 需要撤销时：
   * const restored = MindMapModel.restoreSelection(next, deleted);
   * ```
   */
  public static deleteSubtrees(
    graph: GraphState,
    keys: string[],
  ): { graph: GraphState; deleted: SelectionData } {
    const childrenMap = this.buildChildrenMap(graph.edges);
    const toDelete = this.collectSubtreeKeys(childrenMap, keys);

    const deletedNodes: GraphNode[] = [];
    const nextNodes = new Map(graph.nodes);
    for (const k of Array.from(toDelete)) {
      const node = nextNodes.get(k);
      if (node) {
        deletedNodes.push(node);
        nextNodes.delete(k);
      }
    }

    const deletedEdges: GraphEdge[] = [];
    const nextEdges: GraphEdge[] = [];
    for (const e of graph.edges) {
      if (toDelete.has(e.from) || toDelete.has(e.to)) {
        deletedEdges.push(e);
      } else {
        nextEdges.push(e);
      }
    }

    return {
      graph: {
        ...graph,
        nodes: nextNodes,
        edges: nextEdges,
        version: graph.version + 1,
        nextId: graph.nextId,
      },
      deleted: { nodes: deletedNodes, edges: deletedEdges },
    };
  }

  /**
   * 将之前删除的节点与边恢复回图中（用于撤销）。
   *
   * @param graph 当前图状态
   * @param data 待恢复的节点与边
   * @returns 恢复后的图状态
   */
  public static restoreSelection(graph: GraphState, data: SelectionData): GraphState {
    const nextNodes = new Map(graph.nodes);
    for (const node of data.nodes) {
      nextNodes.set(node.id, node);
    }
    const nextEdges = [...graph.edges, ...data.edges];
    return { ...graph, nodes: nextNodes, edges: nextEdges, version: graph.version + 1 };
  }

  /**
   * 从外部数据（如服务端或导入文件）构建新的 GraphState。
   *
   * - nodes 会以 Map 形式存储
   * - nextId 会尝试从节点 key 的末尾数字推导，避免新增节点 ID 冲突
   *
   * @param graph 当前图状态（仅用于继承 version 的递增语义）
   * @param data 外部图数据
   * @returns 新的图状态
   *
   * @example
   * ```ts
   * const next = MindMapModel.fromGraphData(graph, {
   *   nodes: [{ key: 'n10', title: '标题' }],
   *   edges: [],
   * });
   * ```
   */
  public static fromGraphData(
    graph: GraphState,
    data: {
      nodes: Array<{ key: string; title: string; parent?: string }>;
      edges: Array<{ from: string; to: string }>;
    },
  ): GraphState {
    const nodes = new Map<string, GraphNode>();
    const keys: string[] = [];
    data.nodes.forEach((n) => {
      nodes.set(n.key, { id: n.key, title: n.title });
      keys.push(n.key);
    });

    const maxId = this.parseMaxNumericId(keys);
    const nextId = maxId > 0 ? maxId + 1 : 1000;
    return { nodes, edges: data.edges, version: graph.version + 1, nextId };
  }

  /**
   * 将 edges 转换为 childrenMap，便于后续子树遍历。
   *
   * @param edges 边列表
   * @returns childrenMap（from -> children[]）
   */
  private static buildChildrenMap(edges: GraphEdge[]): Map<string, string[]> {
    const childrenMap = new Map<string, string[]>();
    for (const e of edges) {
      const arr = childrenMap.get(e.from) || [];
      arr.push(e.to);
      childrenMap.set(e.from, arr);
    }
    return childrenMap;
  }

  /**
   * 从若干根节点出发，收集所有后代与自身，形成待删除集合。
   *
   * @param childrenMap 邻接表
   * @param roots 根节点 key 列表
   * @returns 待删除 key 集合
   */
  private static collectSubtreeKeys(
    childrenMap: Map<string, string[]>,
    roots: string[],
  ): Set<string> {
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
    for (const k of roots) {
      if (!toDelete.has(k)) {
        dfs(k);
      }
    }
    return toDelete;
  }

  /**
   * 从 key 列表中解析末尾数字的最大值，用于推导 nextId。
   *
   * @param keys 节点 key 列表
   * @returns 最大数值；若无法解析则返回 0
   */
  private static parseMaxNumericId(keys: string[]): number {
    let maxId = 0;
    for (const key of keys) {
      const match = key.match(/\d+$/);
      if (match) {
        const idNum = parseInt(match[0], 10);
        if (!isNaN(idNum) && idNum > maxId) {
          maxId = idNum;
        }
      }
    }
    return maxId;
  }
}
