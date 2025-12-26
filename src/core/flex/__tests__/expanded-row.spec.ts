import { describe, expect, it } from 'vitest';

import { Widget } from '../../base';
import { MainAxisSize } from '../../type';
import { Expanded } from '../expanded';
import { Row } from '../row';

import type { BoxConstraints, Size } from '../../base';

// Mock Widget to report size
// 修复：SizeReporter 应该尊重 minWidth/minHeight 约束
class SizeReporter extends Widget {
  constructor(
    public width: number,
    public height: number,
  ) {
    super({ type: 'SizeReporter' });
  }
  protected performLayout(constraints: BoxConstraints): Size {
    // 确保宽度在约束范围内
    const width = Math.max(constraints.minWidth, Math.min(this.width, constraints.maxWidth));
    const height = Math.max(constraints.minHeight, Math.min(this.height, constraints.maxHeight));
    return { width, height };
  }
}

describe('Row with Expanded (自动伸缩布局测试)', () => {
  it('正常情况：Expanded 应填充剩余空间', () => {
    // 布局: [Fixed(100)] + [Expanded] + [Fixed(100)]
    // 父容器宽度: 500
    // 预期 Expanded 宽度: 300

    const row = new Row({
      type: 'Row',
      mainAxisSize: MainAxisSize.Max,
    });

    const fixed1 = new SizeReporter(100, 50);
    const fixed2 = new SizeReporter(100, 50);
    const expandedChild = new SizeReporter(10, 50); // 固有尺寸很小

    const expanded = new Expanded({
      type: 'Expanded',
      flex: { flex: 1 },
    });
    // 手动设置 children (模拟 build 过程)
    (expanded as any).children = [expandedChild];
    expandedChild.parent = expanded;

    (row as any).children = [fixed1, expanded, fixed2];
    fixed1.parent = row;
    expanded.parent = row;
    fixed2.parent = row;

    // 绕过 build
    (row as any)._isBuilt = true;
    (expanded as any)._isBuilt = true;

    row.layout({
      minWidth: 0,
      maxWidth: 500,
      minHeight: 0,
      maxHeight: 100,
    });

    // 验证 Row 尺寸
    expect(row.renderObject.size.width).toBe(500);

    // 验证固定子组件
    expect(fixed1.renderObject.size.width).toBe(100);
    expect(fixed2.renderObject.size.width).toBe(100);

    // 验证 Expanded 及其子组件
    // 剩余空间 = 500 - 100 - 100 = 300
    expect(expanded.renderObject.size.width).toBe(300);
    expect(expandedChild.renderObject.size.width).toBe(300);
  });

  it('多 Expanded：应按比例分配空间', () => {
    // 布局: [Expanded(1)] + [Expanded(2)]
    // 父容器宽度: 300
    // 预期: 100 + 200

    const row = new Row({ type: 'Row' });

    const child1 = new SizeReporter(10, 50);
    const expanded1 = new Expanded({ type: 'Expanded', flex: { flex: 1 } });
    (expanded1 as any).children = [child1];
    child1.parent = expanded1;

    const child2 = new SizeReporter(10, 50);
    const expanded2 = new Expanded({ type: 'Expanded', flex: { flex: 2 } });
    (expanded2 as any).children = [child2];
    child2.parent = expanded2;

    (row as any).children = [expanded1, expanded2];
    expanded1.parent = row;
    expanded2.parent = row;
    (row as any)._isBuilt = true;
    (expanded1 as any)._isBuilt = true;
    (expanded2 as any)._isBuilt = true;

    row.layout({ minWidth: 300, maxWidth: 300, minHeight: 0, maxHeight: 100 });

    expect(expanded1.renderObject.size.width).toBe(100);
    expect(expanded2.renderObject.size.width).toBe(200);
  });

  it('父容器尺寸变化：Expanded 应自适应', () => {
    // 布局: [Fixed(50)] + [Expanded]
    // 初始宽度: 150 -> Expanded: 100
    // 调整宽度: 250 -> Expanded: 200

    const row = new Row({ type: 'Row' });
    const fixed = new SizeReporter(50, 50);
    const child = new SizeReporter(10, 50);
    const expanded = new Expanded({ type: 'Expanded', flex: { flex: 1 } });
    (expanded as any).children = [child];
    child.parent = expanded;

    (row as any).children = [fixed, expanded];
    fixed.parent = row;
    expanded.parent = row;
    (row as any)._isBuilt = true;
    (expanded as any)._isBuilt = true;

    // 第一次布局: 150
    row.layout({ minWidth: 150, maxWidth: 150, minHeight: 0, maxHeight: 100 });
    expect(expanded.renderObject.size.width).toBe(100);

    // 第二次布局: 250
    row.layout({ minWidth: 250, maxWidth: 250, minHeight: 0, maxHeight: 100 });
    expect(expanded.renderObject.size.width).toBe(200);
  });

  it('极端情况：父容器宽度为 0', () => {
    const row = new Row({ type: 'Row' });
    const expanded = new Expanded({ type: 'Expanded', flex: { flex: 1 } });
    const child = new SizeReporter(10, 50);
    (expanded as any).children = [child];
    child.parent = expanded;

    (row as any).children = [expanded];
    expanded.parent = row;
    (row as any)._isBuilt = true;
    (expanded as any)._isBuilt = true;

    row.layout({ minWidth: 0, maxWidth: 0, minHeight: 0, maxHeight: 100 });

    expect(expanded.renderObject.size.width).toBe(0);
  });

  it('极端情况：父容器宽度无限 (Infinity)', () => {
    // 如果宽度无限，Expanded 无法计算，应回退到 0
    const row = new Row({ type: 'Row' });
    const expanded = new Expanded({ type: 'Expanded', flex: { flex: 1 } });
    const child = new SizeReporter(10, 50);
    (expanded as any).children = [child];
    child.parent = expanded;

    (row as any).children = [expanded];
    expanded.parent = row;
    (row as any)._isBuilt = true;
    (expanded as any)._isBuilt = true;

    row.layout({ minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: 100 });

    expect(expanded.renderObject.size.width).toBe(0);
  });
});
