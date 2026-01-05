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

  getHash(): string {
    const entries = Array.from(this.customSizes.entries()).sort((a, b) => a[0] - b[0]);
    return JSON.stringify(entries) + `:${this.defaultSize}`;
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

  // 追踪数据边界
  private maxRow: number = 0;
  private maxCol: number = 0;
  private _hash: string = '';

  constructor(config: SheetConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.rowManager = new SizeManager(config.defaultRowHeight);
    this.colManager = new SizeManager(config.defaultColWidth);
    this.updateHash();
  }

  get hash(): string {
    return this._hash;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  private updateHash() {
    const cellEntries = Array.from(this.cells.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    // 为了性能，我们不需要对值进行完整 stringify，只需要 key 和 value 的简单组合
    // 假设 CellData 的 value 是决定性的
    const cellsStr = JSON.stringify(cellEntries);

    const content =
      cellsStr +
      '|' +
      this.rowManager.getHash() +
      '|' +
      this.colManager.getHash() +
      '|' +
      this.maxRow +
      ':' +
      this.maxCol;

    this._hash = this.simpleHash(content);
  }

  private getKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  getCell(row: number, col: number): CellData | undefined {
    return this.cells.get(this.getKey(row, col));
  }

  getDisplayValue(row: number, col: number): string {
    const cell = this.getCell(row, col);
    if (!cell) {
      return '';
    }
    const value = cell.value;
    if (value.startsWith('=')) {
      try {
        return this.evaluateFormula(value.substring(1));
      } catch (e) {
        return '#ERROR!';
      }
    }
    return value;
  }

  private evaluateFormula(expression: string): string {
    // 简单的公式解析：支持 + - * / 和单元格引用 (A1, B2)
    // 替换单元格引用为数值
    const resolvedExpression = expression.replace(/[A-Z]+[0-9]+/g, (match) => {
      const { row, col } = this.parseCellReference(match);
      const cell = this.getCell(row, col);
      const val = cell?.value;
      if (!val) {
        return '0';
      }
      // 如果引用的单元格也是公式，递归计算 (简单处理，暂不处理循环引用)
      if (val.startsWith('=')) {
        return this.evaluateFormula(val.substring(1));
      }
      return isNaN(Number(val)) ? '0' : val;
    });

    try {
      // 使用 Function 构造函数进行安全计算
      // 注意：实际生产环境应使用专门的表达式解析库

      return new Function(`return ${resolvedExpression}`)().toString();
    } catch (e) {
      return '#ERROR!';
    }
  }

  private parseCellReference(ref: string): { row: number; col: number } {
    const colStr = ref.match(/[A-Z]+/)?.[0] || '';
    const rowStr = ref.match(/[0-9]+/)?.[0] || '';

    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 65 + 1);
    }

    return {
      row: parseInt(rowStr, 10) - 1,
      col: col - 1,
    };
  }

  setCell(row: number, col: number, data: CellData | undefined) {
    const key = this.getKey(row, col);
    if (!data || (!data.value && !data.style)) {
      this.cells.delete(key);
      this.updateHash();
      return;
    }
    this.cells.set(key, data);
    this.maxRow = Math.max(this.maxRow, row);
    this.maxCol = Math.max(this.maxCol, col);
    this.updateHash();
  }

  getRowCount(): number {
    return this.config.rowCount ?? Math.max(this.maxRow + 100, 100);
  }

  getColCount(): number {
    return this.config.colCount ?? Math.max(this.maxCol + 26, 26);
  }

  getRowHeight(row: number): number {
    return this.rowManager.getSize(row);
  }

  setRowHeight(row: number, height: number) {
    this.rowManager.setSize(row, height);
    this.updateHash();
  }

  getColWidth(col: number): number {
    return this.colManager.getSize(col);
  }

  setColWidth(col: number, width: number) {
    this.colManager.setSize(col, width);
    this.updateHash();
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
    const index = this.rowManager.getIndex(offset);
    return Math.min(Math.max(0, index), this.getRowCount() - 1);
  }

  getColIndexAt(offset: number): number {
    const index = this.colManager.getIndex(offset);
    return Math.min(Math.max(0, index), this.getColCount() - 1);
  }

  getTotalWidth(): number {
    return this.colManager.getTotalSize(this.getColCount());
  }

  getTotalHeight(): number {
    return this.rowManager.getTotalSize(this.getRowCount());
  }

  // 扩展边界以支持无限滚动
  ensureVisible(row: number, col: number) {
    let changed = false;
    if (this.config.rowCount === undefined && row > this.maxRow) {
      this.maxRow = row;
      changed = true;
    }
    if (this.config.colCount === undefined && col > this.maxCol) {
      this.maxCol = col;
      changed = true;
    }
    if (changed) {
      this.updateHash();
    }
    return changed;
  }
}
