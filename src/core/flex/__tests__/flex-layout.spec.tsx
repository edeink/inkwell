/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import {
  Widget,
  createBoxConstraints,
  createTightConstraints,
  type BoxConstraints,
  type Size,
} from '@/core/base';
import { Column } from '@/core/flex/column';
import { Row } from '@/core/flex/row';
import { CrossAxisAlignment, FlexFit, MainAxisSize } from '@/core/type';
import { testLogger } from '@/utils/test-logger';

// Mock Container to allow manual property updates for testing
class TestContainer extends Widget {
  public width?: number;
  public height?: number;
  public color?: string;

  public layoutCount = 0;

  constructor(props: any = {}) {
    super({ ...props });
    this.width = props.width;
    this.height = props.height;
    this.color = props.color;
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    this.layoutCount++;
    // Simple sizing logic: prefer explicit size, else use constraint min
    const w =
      this.width !== undefined
        ? Math.min(Math.max(this.width, constraints.minWidth), constraints.maxWidth)
        : constraints.minWidth;

    const h =
      this.height !== undefined
        ? Math.min(Math.max(this.height, constraints.minHeight), constraints.maxHeight)
        : constraints.minHeight;

    return { width: w, height: h };
  }
}

class TestExpandToMaxWidthIfBounded extends Widget {
  constructor(props: any = {}) {
    super({ ...props });
  }

  protected performLayout(constraints: BoxConstraints, _childrenSizes: Size[]): Size {
    const w = isFinite(constraints.maxWidth) ? constraints.maxWidth : 10;
    return { width: w, height: 10 };
  }
}

describe('Flex Layout Unit Tests', () => {
  it('Row 非 Flex 子组件主轴应接收无界约束', () => {
    const row = new Row({ mainAxisSize: MainAxisSize.Min });
    const child = new TestExpandToMaxWidthIfBounded();

    row.children = [child];
    child.parent = row;

    row.layout(createBoxConstraints({ maxWidth: 500, maxHeight: 100 }));

    const childConstraints = (child.renderObject as any).constraints;
    expect(childConstraints.maxWidth).toBe(Infinity);
    expect(child.renderObject.size.width).toBe(10);
    expect(row.renderObject.size.width).toBe(10);
  });

  // 1. 子元素变化需要父元素重新布局的测试用例
  it('当非Flex子元素尺寸变化时，应触发父容器(Row/Wrap)重新布局', () => {
    // Setup: Row with MainAxisSize.Min (wraps content)
    const row = new Row({
      mainAxisSize: MainAxisSize.Min,
    });
    const child1 = new TestContainer({ width: 50, height: 50 });
    const child2 = new TestContainer({ width: 50, height: 50 });

    row.children = [child1, child2];
    child1.parent = row;
    child2.parent = row;

    // Initial Layout
    // Parent constraint is loose
    const constraints = createBoxConstraints({ maxWidth: 500, maxHeight: 500 });
    row.layout(constraints);

    // Initial check
    expect(row.renderObject.size.width).toBe(100); // 50 + 50
    expect((row as any)._needsLayout).toBe(false);

    // Modify Child Size
    child1.width = 100; // Change from 50 to 100

    // Reset layout flags for clean test (simulate previous frame done)
    (row as any)._needsLayout = false;
    (child1 as any)._needsLayout = false;

    // Trigger update
    child1.markNeedsLayout();

    // Verify propagation
    // Child1 has loose constraints (0-500), so it is NOT a RelayoutBoundary.
    // Therefore, markNeedsLayout should propagate to parent.
    expect((child1 as any)._needsLayout).toBe(true);
    expect((row as any)._needsLayout).toBe(true);

    // Re-layout
    row.layout(constraints);

    // Verify result
    expect(row.renderObject.size.width).toBe(150); // 100 + 50
  });

  // 2. 子元素变化不需要父元素重新布局的测试用例
  it('当Flex子元素(Tight fit)仅发生内部非布局变更时，不应触发父容器重新布局', () => {
    // Setup: Row with fixed width
    const row = new Row({
      mainAxisSize: MainAxisSize.Max,
    });
    // Child with flex: 1 (Tight fit)
    const child1 = new TestContainer({ flex: { flex: 1, fit: FlexFit.Tight }, height: 50 });

    row.children = [child1];
    child1.parent = row;

    // Initial Layout
    // Row gets tight width 200
    const constraints = createTightConstraints(200, 100);
    // Force Stretch to ensure tight height constraints for child
    row.crossAxisAlignment = CrossAxisAlignment.Stretch;

    row.layout(constraints);

    // Initial check
    expect(child1.renderObject.size.width).toBe(200); // Takes full width
    expect((row as any)._needsLayout).toBe(false);
    expect((child1 as any)._needsLayout).toBe(false);

    // Check child constraints - should be Tight
    const childConstraints = (child1.renderObject as any).constraints;
    expect(childConstraints.minWidth).toBe(childConstraints.maxWidth);
    expect(childConstraints.minHeight).toBe(childConstraints.maxHeight);

    // Modify Non-Layout Property (e.g. color)
    child1.color = 'red';

    // Reset flags
    (row as any)._needsLayout = false;
    (child1 as any)._needsLayout = false;

    // Trigger update
    child1.markNeedsLayout();

    // Verify propagation
    expect((child1 as any)._needsLayout).toBe(true);
    expect((row as any)._needsLayout).toBe(false); // Should NOT propagate

    // Layout again
    row.layout(constraints);
  });

  // 3. 性能验证测试
  it('性能测试：高频子元素变更下的布局传播与耗时', () => {
    const row = new Row({ mainAxisSize: MainAxisSize.Min });
    const children: TestContainer[] = [];
    const count = 100;

    for (let i = 0; i < count; i++) {
      const c = new TestContainer({ width: 10, height: 10 });
      children.push(c);
    }
    row.children = children;
    children.forEach((c) => (c.parent = row));

    const constraints = createBoxConstraints({ maxWidth: 2000, maxHeight: 100 });
    row.layout(constraints);

    // Measure time for update
    const start = performance.now();

    // Update all children
    // Case A: Size change -> propagates to Row
    children.forEach((c) => {
      c.width = 11;
      c.markNeedsLayout();
    });

    // Check propagation
    expect((row as any)._needsLayout).toBe(true);

    // Re-layout
    row.layout(constraints);

    const end = performance.now();
    const duration = end - start;

    testLogger.log(`[Perf] 100 children resize & layout: ${duration.toFixed(3)}ms`);
    // Relaxed expectation for CI environments
    expect(duration).toBeLessThan(100);
    expect(row.renderObject.size.width).toBe(11 * count);
  });

  // 4. 边界条件测试
  it('边界条件：空容器、嵌套容器与动态增删', () => {
    // 4.1 Empty Container
    const emptyCol = new Column({ mainAxisSize: MainAxisSize.Min });
    emptyCol.layout(createBoxConstraints({}));
    expect(emptyCol.renderObject.size.height).toBe(0);

    // 4.2 Nested Flex
    const rootRow = new Row({ mainAxisSize: MainAxisSize.Min });
    const subCol = new Column({ mainAxisSize: MainAxisSize.Min });
    const item = new TestContainer({ width: 50, height: 50 });

    subCol.children = [item];
    item.parent = subCol;

    rootRow.children = [subCol];
    subCol.parent = rootRow;

    rootRow.layout(createBoxConstraints({ maxWidth: 200, maxHeight: 200 }));

    expect(subCol.renderObject.size.height).toBe(50);
    expect(rootRow.renderObject.size.width).toBe(50);

    // 4.3 Dynamic Add/Remove
    const item2 = new TestContainer({ width: 50, height: 50 });
    subCol.children.push(item2);
    item2.parent = subCol;

    // Manually mark subCol dirty because we changed children list directly
    // (In real framework, setting children prop would trigger this)
    subCol.markNeedsLayout();

    // Propagate
    expect((rootRow as any)._needsLayout).toBe(true);

    rootRow.layout(createBoxConstraints({ maxWidth: 200, maxHeight: 200 }));
    expect(subCol.renderObject.size.height).toBe(100); // 50 + 50
  });
});
