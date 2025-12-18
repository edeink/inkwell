import { describe, expect, it, vi } from 'vitest';

import { Padding, type PaddingArray } from '../padding';

describe('Padding 组件', () => {
  it('应处理数字类型的输入', () => {
    const padding = new Padding({ type: 'Padding', padding: 10 });
    expect(padding.padding).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
  });

  it('应处理 EdgeInsets 对象类型的输入', () => {
    const insets = { top: 1, right: 2, bottom: 3, left: 4 };
    const padding = new Padding({ type: 'Padding', padding: insets });
    expect(padding.padding).toEqual(insets);
  });

  it('应处理单元素数组输入 [all]', () => {
    const padding = new Padding({ type: 'Padding', padding: [10] });
    expect(padding.padding).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });
  });

  it('应处理双元素数组输入 [vertical, horizontal]', () => {
    // [8, 12] -> top/bottom=8, left/right=12
    const padding = new Padding({ type: 'Padding', padding: [8, 12] });
    expect(padding.padding).toEqual({ top: 8, right: 12, bottom: 8, left: 12 });
  });

  it('应处理三元素数组输入 [top, horizontal, bottom]', () => {
    // [8, 12, 4] -> top=8, left/right=12, bottom=4
    const padding = new Padding({ type: 'Padding', padding: [8, 12, 4] });
    expect(padding.padding).toEqual({ top: 8, right: 12, bottom: 4, left: 12 });
  });

  it('应处理四元素数组输入 [top, right, bottom, left]', () => {
    // [8, 12, 4, 16] -> top=8, right=12, bottom=4, left=16
    const padding = new Padding({ type: 'Padding', padding: [8, 12, 4, 16] });
    expect(padding.padding).toEqual({ top: 8, right: 12, bottom: 4, left: 16 });
  });

  it('应处理无效的数组长度（空数组）', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const padding = new Padding({ type: 'Padding', padding: [] as unknown as PaddingArray });
    expect(padding.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(consoleSpy).toHaveBeenCalledWith('Padding 数组长度必须在 1 到 4 之间');
    consoleSpy.mockRestore();
  });

  it('应处理无效的数组长度（超过4个元素）', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const padding = new Padding({
      type: 'Padding',
      padding: [1, 2, 3, 4, 5] as unknown as PaddingArray,
    });
    expect(padding.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(consoleSpy).toHaveBeenCalledWith('Padding 数组长度必须在 1 到 4 之间');
    consoleSpy.mockRestore();
  });

  it('应处理数组中包含非数字元素的情况', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const padding = new Padding({
      type: 'Padding',
      padding: [10, '20'] as unknown as PaddingArray,
    });
    expect(padding.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(consoleSpy).toHaveBeenCalledWith('Padding 数组必须仅包含数字');
    consoleSpy.mockRestore();
  });

  it('当 createElement 使用新属性调用时应更新 padding', () => {
    const padding = new Padding({ type: 'Padding', padding: 10 });
    expect(padding.padding).toEqual({ top: 10, right: 10, bottom: 10, left: 10 });

    padding.createElement({ type: 'Padding', padding: [20, 30] });
    expect(padding.padding).toEqual({ top: 20, right: 30, bottom: 20, left: 30 });
  });
});
