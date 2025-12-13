import type { Widget } from '../../core/base';
import type { DataNode } from 'antd/es/tree';

/**
 * DevTools 树节点类型
 * 字段说明：key - 唯一标识；type - 组件类型；props - 展示用数据；children - 子节点列表
 */
export type DevTreeNode = {
  key: string;
  type: string;
  props?: Record<string, unknown>;
  children: DevTreeNode[];
};

/**
 * Widget → DevTreeNode 转换
 * 功能：将运行时 Widget 结构转换为 DevTools 使用的轻量树节点
 * 参数：node - 根组件
 * 返回：DevTreeNode 或 null
 */
export function toTree(node: Widget | null): DevTreeNode | null {
  if (!node) {
    return null;
  }
  return {
    key: node.key,
    type: node.type,
    props: { ...node.data, children: undefined },
    children: node.children.map((c) => toTree(c)!).filter(Boolean) as DevTreeNode[],
  };
}

/**
 * DevTreeNode → Antd Tree 数据
 * 功能：将 DevTools 树节点转换为 Antd Tree 的 `DataNode[]`
 * 参数：node - 根节点
 * 返回：`DataNode[]`
 */
export function toAntTreeData(node: DevTreeNode | null): DataNode[] {
  if (!node) {
    return [];
  }
  function wrap(n: DevTreeNode): DataNode {
    return {
      title: `${n.type} [${n.key}]`,
      key: n.key,
      children: (n.children || []).map((c) => wrap(c)),
    };
  }
  return [wrap(node)];
}

/**
 * 获取从根到目标节点的路径 key 列表
 * 参数：root - 根组件；k - 目标 key
 * 返回：路径上的 key 列表
 */
export function getPathKeys(root: Widget | null, k: string): string[] {
  const path: string[] = [];
  function dfs(node: Widget | null): boolean {
    if (!node) {
      return false;
    }
    path.push(node.key);
    if (node.key === k) {
      return true;
    }
    for (const c of node.children) {
      if (dfs(c)) {
        return true;
      }
    }
    path.pop();
    return false;
  }
  dfs(root);
  return path;
}
