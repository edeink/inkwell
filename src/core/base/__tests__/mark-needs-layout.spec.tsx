/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import {
  Widget,
  createBoxConstraints,
  createTightConstraints,
  type BoxConstraints,
  type Size,
} from '@/core/base';

// 自定义测试组件，方便控制行为
class TestWidget extends Widget {
  layoutCount = 0;

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    this.layoutCount++;
    // 简单实现：取最小约束尺寸
    return {
      width: constraints.minWidth,
      height: constraints.minHeight,
    };
  }
}

function buildTree(): { root: TestWidget; child: TestWidget } {
  const root = new TestWidget({});
  const child = new TestWidget({});
  root.children = [child];
  child.parent = root;

  // 初始布局
  root.layout(createBoxConstraints());
  return { root, child };
}

describe('markNeedsLayout 优化与约束缓存', () => {
  it('当约束为紧约束(Tight)时，停止向上传播 (RelayoutBoundary)', () => {
    const { root, child } = buildTree();

    // 手动设置 child 为紧约束，模拟它是 RelayoutBoundary
    child.renderObject.constraints = createTightConstraints(100, 100);
    // 必须手动更新 _relayoutBoundary，因为这通常是在 layout 阶段根据约束计算的
    (child as any)._relayoutBoundary = child;

    // 重置状态
    (root as any)._needsLayout = false;
    (child as any)._needsLayout = false;

    child.markNeedsLayout();

    expect((child as any)._needsLayout).toBe(true);
    // 核心验证：root 不应被标记，因为 child 是边界
    expect((root as any)._needsLayout).toBe(false);
  });

  it('当约束为松散约束(Loose)时，继续向上传播', () => {
    const { root, child } = buildTree();

    // 手动设置 child 为松散约束
    child.renderObject.constraints = createBoxConstraints({ minWidth: 0, maxWidth: 100 });

    (root as any)._needsLayout = false;
    (child as any)._needsLayout = false;

    child.markNeedsLayout();

    expect((child as any)._needsLayout).toBe(true);
    expect((root as any)._needsLayout).toBe(true);
  });

  it('layout 缓存优化：约束未变且不需布局时直接返回缓存尺寸，不执行 performLayout', () => {
    const { root } = buildTree();
    const c1 = createTightConstraints(100, 100);

    // 第一次布局
    root.layout(c1);
    const initialCount = root.layoutCount;

    // 再次布局，相同约束，且 _needsLayout = false
    root.layout(c1);

    // 验证 layoutCount 未增加
    expect(root.layoutCount).toBe(initialCount);
  });

  it('layout 缓存失效：约束变化时重新布局', () => {
    const { root } = buildTree();
    const c1 = createTightConstraints(100, 100);
    root.layout(c1);
    const initialCount = root.layoutCount;

    // 新约束
    const c2 = createTightConstraints(150, 150);
    root.layout(c2);

    expect(root.layoutCount).toBe(initialCount + 1);
  });

  it('layout 缓存失效：标记 dirty 后即使约束未变也重新布局', () => {
    const { root } = buildTree();
    const c1 = createTightConstraints(100, 100);
    root.layout(c1);
    const initialCount = root.layoutCount;

    // 标记 dirty
    root.markNeedsLayout();

    // 相同约束
    root.layout(c1);

    expect(root.layoutCount).toBe(initialCount + 1);
  });
});
