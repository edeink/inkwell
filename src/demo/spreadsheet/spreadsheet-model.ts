import { DEFAULT_CONFIG } from './types';

import type { CellData, SheetConfig } from './types';

/**
 * 尺寸管理器
 * 用于管理行高和列宽，支持默认值和特定行列的自定义尺寸。
 * 提供 O(log N) 的位置查询能力（通过缓存累加和或二分查找）。
 *
 * 简化实现：考虑到百万级数据，维护一个完整的累加数组可能占用内存。
 * 这里使用 "默认值 + 异常值 Map" 的方式。
 * 位置计算：如果异常值较少，可以遍历异常值 Map 修正。
 * 如果异常值很多，应当构建索引。
 *
 * 为了演示性能和简单性平衡，我们假设大部分是默认值。
 */
class SizeManager {
  private defaultSize: number;
  private customSizes: Map<number, number> = new Map();
  // 缓存总大小，每次修改时更新（如果需要）
  // 对于百万级，我们不缓存所有位置的 offset，而是实时计算。
  // 为了加速 getOffset，我们可以维护一个 "Changes List" 并排序。

  constructor(defaultSize: number) {
    this.defaultSize = defaultSize;
  }

  getSize(index: number): number {
    return this.customSizes.get(index) ?? this.defaultSize;
  }

  setSize(index: number, size: number) {
    this.customSizes.set(index, size);
  }

  /**
   * 获取指定索引的起始偏移量
   * O(K) 其中 K 是自定义尺寸的数量。
   * 优化：可以对自定义尺寸的键进行排序。
   */
  getOffset(index: number): number {
    let offset = index * this.defaultSize;
    // 修正自定义尺寸带来的差值
    for (const [idx, size] of this.customSizes) {
      if (idx < index) {
        offset += size - this.defaultSize;
      }
    }
    return offset;
  }

  /**
   * 根据偏移量查找索引
   * O(K)
   */
  getIndex(offset: number): number {
    // 粗略估计
    let index = Math.floor(offset / this.defaultSize);

    // 迭代修正
    // 这是一个简化算法，对于大量自定义尺寸可能会慢。
    // 真正的高性能实现需要线段树或分块索引。
    // 这里为了演示，我们假设自定义尺寸数量有限。

    // 简单实现：我们直接遍历，或者二分查找。
    // 由于我们没有维护全局累加和数组，直接反推比较困难。
    // 我们可以尝试从粗略估计值开始向前或向后搜索。

    let currentOffset = this.getOffset(index);

    // 向后搜索
    while (currentOffset <= offset) {
      const size = this.getSize(index);
      if (currentOffset + size > offset) {
        return index;
      }
      currentOffset += size;
      index++;
    }

    // 向前搜索
    while (currentOffset > offset && index > 0) {
      index--;
      const size = this.getSize(index);
      currentOffset -= size;
      if (currentOffset <= offset) {
        return index;
      }
    }

    return index;
  }

  getTotalSize(count: number): number {
    return this.getOffset(count);
  }
}

/**
 * 电子表格数据模型
 * 使用稀疏矩阵存储数据
 */
export class SpreadsheetModel {
  private cells: Map<string, CellData> = new Map();
  private rowManager: SizeManager;
  private colManager: SizeManager;
  config: SheetConfig;

  constructor(config: SheetConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.rowManager = new SizeManager(config.defaultRowHeight);
    this.colManager = new SizeManager(config.defaultColWidth);
  }

  private getKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  getCell(row: number, col: number): CellData | undefined {
    return this.cells.get(this.getKey(row, col));
  }

  setCell(row: number, col: number, data: CellData) {
    this.cells.set(this.getKey(row, col), data);
  }

  getRowHeight(row: number): number {
    return this.rowManager.getSize(row);
  }

  setRowHeight(row: number, height: number) {
    this.rowManager.setSize(row, height);
  }

  getColWidth(col: number): number {
    return this.colManager.getSize(col);
  }

  setColWidth(col: number, width: number) {
    this.colManager.setSize(col, width);
  }

  resizeRow(row: number, delta: number) {
    const current = this.getRowHeight(row);
    this.setRowHeight(row, Math.max(2, current + delta));
  }

  resizeCol(col: number, delta: number) {
    const current = this.getColWidth(col);
    this.setColWidth(col, Math.max(2, current + delta));
  }

  getRowOffset(row: number): number {
    return this.rowManager.getOffset(row);
  }

  getColOffset(col: number): number {
    return this.colManager.getOffset(col);
  }

  getRowIndexAt(offset: number): number {
    return Math.min(Math.max(0, this.rowManager.getIndex(offset)), this.config.rowCount - 1);
  }

  getColIndexAt(offset: number): number {
    return Math.min(Math.max(0, this.colManager.getIndex(offset)), this.config.colCount - 1);
  }

  getTotalWidth(): number {
    return this.colManager.getTotalSize(this.config.colCount);
  }

  getTotalHeight(): number {
    return this.rowManager.getTotalSize(this.config.rowCount);
  }
}
