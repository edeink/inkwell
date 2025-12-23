import { describe, expect, it, vi } from 'vitest';

import { DeleteNodeCommand } from '../commands/edit';

describe('DeleteNodeCommand', () => {
  it('应正确执行删除并保存数据', () => {
    const mockData = { nodes: [{ id: 'node1' }], edges: [] };
    const viewport = {
      deleteSelection: vi.fn().mockReturnValue(mockData),
      restoreSelection: vi.fn(),
    } as any;

    const command = new DeleteNodeCommand(viewport);
    command.execute();

    expect(viewport.deleteSelection).toHaveBeenCalled();
    // 验证内部状态保存（由于 deletedData 是私有的，通过 undo 间接验证）
  });

  it('Undo 操作应还原数据', () => {
    const mockData = { nodes: [{ id: 'node1' }], edges: [] };
    const viewport = {
      deleteSelection: vi.fn().mockReturnValue(mockData),
      restoreSelection: vi.fn(),
    } as any;

    const command = new DeleteNodeCommand(viewport);
    command.execute();
    command.undo();

    expect(viewport.restoreSelection).toHaveBeenCalledWith(mockData);
  });

  it('当没有数据被删除时，Undo 不应执行还原', () => {
    const viewport = {
      deleteSelection: vi.fn().mockReturnValue(null),
      restoreSelection: vi.fn(),
    } as any;

    const command = new DeleteNodeCommand(viewport);
    command.execute();
    command.undo();

    expect(viewport.restoreSelection).not.toHaveBeenCalled();
  });

  it('应记录元数据', () => {
    // 这里我们无法直接访问 private 属性，但可以通过扩展类或反射来测试
    // 或者我们相信代码实现。为了演示，我们可以通过 casting any 来检查
    const mockData = { nodes: [{ id: 'node1' }], edges: [] };
    const viewport = {
      deleteSelection: vi.fn().mockReturnValue(mockData),
    } as any;

    const command = new DeleteNodeCommand(viewport);
    command.execute();

    const data = (command as any).deletedData;
    expect(data).toBeDefined();
    expect(data.payload).toEqual(mockData);
    expect(data.timestamp).toBeTypeOf('number');
    expect(data.operator).toBe('user');
  });
});
