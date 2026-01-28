import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Widget } from '../../base';
import { PipelineOwner } from '../owner';

// 简单的测试 Widget
class TestWidget extends Widget {
  constructor(key: string, depth: number = 0) {
    // @ts-ignore: 简化构造参数
    super({ key });
    this.depth = depth;
    // 模拟 RepaintBoundary 行为，使得 updateLayer 可被调用
    this.isRepaintBoundary = true;
    // @ts-ignore: Mock runtime for updateLayer check
    this.runtime = { renderer: {} };
  }

  // 覆盖 updateLayer 以便 spy
  // 注意：在真实 Widget 中 updateLayer 调用 _paintWithLayer
  // 这里我们 mock 它
  updateLayer = vi.fn();

  performRebuildAndLayout = vi.fn();
}

describe('PipelineOwner', () => {
  let owner: PipelineOwner;

  beforeEach(() => {
    owner = new PipelineOwner();
  });

  describe('flushPaint', () => {
    it('应该按深度优先顺序（最深优先）处理脏节点', () => {
      const parent = new TestWidget('parent', 1);
      const child = new TestWidget('child', 2);
      const root = new TestWidget('root', 0);

      // 手动添加，模拟调度
      owner.schedulePaintFor(parent);
      owner.schedulePaintFor(child);
      owner.schedulePaintFor(root);

      // 标记为脏
      // @ts-ignore: 访问 protected 属性
      parent._needsPaint = true;
      // @ts-ignore
      child._needsPaint = true;
      // @ts-ignore
      root._needsPaint = true;

      owner.flushPaint();

      // 验证调用顺序：child -> parent -> root (depth: 2 -> 1 -> 0)
      expect(child.updateLayer).toHaveBeenCalled();
      expect(parent.updateLayer).toHaveBeenCalled();
      expect(root.updateLayer).toHaveBeenCalled();

      // 验证调用时机
      // child 应该在 parent 之前
      const childOrder = (child.updateLayer as any).mock.invocationCallOrder[0];
      const parentOrder = (parent.updateLayer as any).mock.invocationCallOrder[0];
      const rootOrder = (root.updateLayer as any).mock.invocationCallOrder[0];

      expect(childOrder).toBeLessThan(parentOrder);
      expect(parentOrder).toBeLessThan(rootOrder);
    });

    it('应该只处理 isPaintDirty 为 true 的节点', () => {
      const node1 = new TestWidget('node1', 1);
      const node2 = new TestWidget('node2', 1);

      owner.schedulePaintFor(node1);
      owner.schedulePaintFor(node2);

      // node1 is dirty, node2 is NOT dirty
      // @ts-ignore
      node1._needsPaint = true;
      // @ts-ignore
      node2._needsPaint = false;

      owner.flushPaint();

      expect(node1.updateLayer).toHaveBeenCalled();
      expect(node2.updateLayer).not.toHaveBeenCalled();
    });

    it('应该处理 updateLayer 抛出的异常而不中断管线', () => {
      const node1 = new TestWidget('error-node', 2); // 先执行
      const node2 = new TestWidget('normal-node', 1); // 后执行

      owner.schedulePaintFor(node1);
      owner.schedulePaintFor(node2);

      // @ts-ignore
      node1._needsPaint = true;
      // @ts-ignore
      node2._needsPaint = true;

      // 模拟抛出异常
      (node1.updateLayer as any).mockImplementation(() => {
        throw new Error('Test Error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      owner.flushPaint();

      // node2 应该仍然被执行
      expect(node2.updateLayer).toHaveBeenCalled();
      // 应该记录错误
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('执行后应该清空待绘制列表', () => {
      const node = new TestWidget('node', 0);
      owner.schedulePaintFor(node);
      // @ts-ignore
      node._needsPaint = true;

      expect(owner.hasScheduledPaint).toBe(true);

      owner.flushPaint();

      expect(owner.hasScheduledPaint).toBe(false);
    });
  });
});
