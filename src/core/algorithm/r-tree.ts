/**
 * R-Tree 实现 (静态 / STR 批量加载算法)
 * 专为一次性构建和多次查询优化，非常适合 UI 选区检测场景。
 *
 * 实现原理：
 * 使用 Sort-Tile-Recursive (STR) 算法进行批量加载。
 * 1. 将所有数据项按 x 坐标排序。
 * 2. 将数据切分为 S 个垂直切片 (S = sqrt(N/M))。
 * 3. 在每个切片内，按 y 坐标排序。
 * 4. 将切片内的节点打包成父节点。
 * 这种方法可以最大化填充率并最小化重叠区域，从而提高查询效率。
 *
 * 时间复杂度：
 * - 构建 (Build): O(N log N) - 主要耗时在排序上。
 * - 查询 (Search): O(log_M N) - 平均情况，最坏情况为 O(N) (如果所有节点重叠)。
 *   其中 N 是节点总数，M 是每个节点的最大条目数。
 *
 * 空间复杂度：O(N)
 */

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface LeafEntry<T> {
  item: T;
  bbox: BBox;
}

interface Node<T> {
  bbox: BBox;
  leaf: boolean;
  children: Node<T>[] | LeafEntry<T>[];
}

export class RTree<T> {
  private root: Node<T> | null = null;
  private maxEntries: number;

  constructor(maxEntries: number = 9) {
    this.maxEntries = maxEntries;
  }

  /**
   * 批量加载数据项以构建树。
   * 此操作会替换当前的树结构。
   * @param items 包含边界框的数据项数组
   */
  load(items: LeafEntry<T>[]) {
    if (items.length === 0) {
      this.root = null;
      return;
    }
    this.root = this.build(items);
  }

  /**
   * 搜索与给定边界框相交的所有项。
   * @param bbox 查询边界框
   * @returns 相交的数据项数组
   */
  search(bbox: BBox): T[] {
    if (!this.root) {
      return [];
    }
    const results: T[] = [];
    this._search(this.root, bbox, results);
    return results;
  }

  private _search(node: Node<T>, bbox: BBox, results: T[]) {
    // 边界条件：如果当前节点包围盒不相交，直接返回
    if (!intersects(node.bbox, bbox)) {
      return;
    }
    if (node.leaf) {
      const items = node.children as LeafEntry<T>[];
      for (const child of items) {
        if (intersects(child.bbox, bbox)) {
          results.push(child.item);
        }
      }
    } else {
      const children = node.children as Node<T>[];
      for (const child of children) {
        this._search(child, bbox, results);
      }
    }
  }

  private build(items: LeafEntry<T>[]): Node<T> {
    // 边界条件：如果项数少于最大条目数，直接创建叶子节点
    if (items.length <= this.maxEntries) {
      return {
        bbox: calcBBox(items),
        leaf: true,
        children: items,
      };
    }

    const N = items.length;
    const M = this.maxEntries;

    // 计算切片数量
    const nodeCount = Math.ceil(N / M);
    const sliceCount = Math.ceil(Math.sqrt(nodeCount));
    const itemsPerSlice = Math.ceil(nodeCount / sliceCount) * M;

    // 按 X 轴排序
    items.sort((a, b) => a.bbox.minX - b.bbox.minX);

    const children: Node<T>[] = [];

    for (let i = 0; i < N; i += itemsPerSlice) {
      const slice = items.slice(i, i + itemsPerSlice);
      // 切片内按 Y 轴排序
      slice.sort((a, b) => a.bbox.minY - b.bbox.minY);

      for (let j = 0; j < slice.length; j += M) {
        const chunk = slice.slice(j, j + M);
        children.push(this.build(chunk));
      }
    }

    return {
      bbox: calcNodeBBox(children),
      leaf: false,
      children: children,
    };
  }
}

/**
 * 判断两个边界框是否相交
 */
function intersects(a: BBox, b: BBox): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/**
 * 计算一组项的包围盒
 */
function calcBBox(items: { bbox: BBox }[]): BBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const item of items) {
    minX = Math.min(minX, item.bbox.minX);
    minY = Math.min(minY, item.bbox.minY);
    maxX = Math.max(maxX, item.bbox.maxX);
    maxY = Math.max(maxY, item.bbox.maxY);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * 计算一组节点的包围盒
 */
function calcNodeBBox<T>(nodes: Node<T>[]): BBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.bbox.minX);
    minY = Math.min(minY, node.bbox.minY);
    maxX = Math.max(maxX, node.bbox.maxX);
    maxY = Math.max(maxY, node.bbox.maxY);
  }
  return { minX, minY, maxX, maxY };
}
