import { describe, expect, it } from 'vitest';

import { SpreadsheetModel } from './spreadsheet-model';
import { DEFAULT_CONFIG } from './types';

describe('SpreadsheetModel', () => {
  it('应使用默认配置初始化', () => {
    const model = new SpreadsheetModel();
    expect(model.config).toEqual(DEFAULT_CONFIG);
    // 默认无限滚动，初始大小基于内部常量
    expect(model.getRowCount()).toBe(100);
    expect(model.getColCount()).toBe(26);
  });

  it('应支持稀疏矩阵存储', () => {
    const model = new SpreadsheetModel();

    // 设置数据
    model.setCell(1000, 1000, { value: 'Far' });
    expect(model.getCell(1000, 1000)?.value).toBe('Far');

    // 中间单元格应为空
    expect(model.getCell(500, 500)).toBeUndefined();

    // 设置空数据应删除条目
    model.setCell(1000, 1000, { value: '' });
    expect(model.getCell(1000, 1000)).toBeUndefined();
  });

  it('应动态调整行数和列数', () => {
    const model = new SpreadsheetModel();

    // 初始状态
    expect(model.getRowCount()).toBe(100);

    // 设置远端数据，应该扩展边界
    model.setCell(200, 50, { value: 'Extend' });

    // 边界应至少包含新数据 + 缓冲区
    expect(model.getRowCount()).toBeGreaterThan(200);
    expect(model.getColCount()).toBeGreaterThan(50);
  });

  it('ensureVisible 应正确触发边界扩展', () => {
    const model = new SpreadsheetModel();
    const initialRows = model.getRowCount();

    // 滚动到接近底部
    const changed = model.ensureVisible(initialRows + 10, 5);

    expect(changed).toBe(true);
    expect(model.getRowCount()).toBeGreaterThan(initialRows);
  });

  it('如果配置了固定行列数，ensureVisible 不应扩展', () => {
    const model = new SpreadsheetModel({
      ...DEFAULT_CONFIG,
      rowCount: 50,
      colCount: 20,
    });

    const changed = model.ensureVisible(100, 100);
    expect(changed).toBe(false);
    expect(model.getRowCount()).toBe(50);
  });

  it('公式计算基础功能', () => {
    const model = new SpreadsheetModel();
    model.setCell(0, 0, { value: '10' });
    model.setCell(0, 1, { value: '20' });
    model.setCell(0, 2, { value: '=A1+B1' });

    expect(model.getDisplayValue(0, 2)).toBe('30');
  });
});
