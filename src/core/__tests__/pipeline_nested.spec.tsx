/** @jsxImportSource @/utils/compiler */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import Runtime from '../../runtime';
import { createTightConstraints, Widget, type BoxConstraints, type Size } from '../base';
import { WidgetRegistry } from '../registry';

import type { ComponentType } from '@/core/type';

// 辅助类型转换
const asType = (type: string) => type as unknown as ComponentType;

// 模拟 Canvas 上下文
const mockContext = {
  canvas: { width: 800, height: 600 },
  scale: vi.fn(),
  translate: vi.fn(),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  stroke: vi.fn(),
  fill: vi.fn(),
  setTransform: vi.fn(),
  getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
} as unknown as CanvasRenderingContext2D;

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    contextId: string,
  ) {
    if (contextId === '2d') {
      (mockContext as any).canvas = this;
      return mockContext;
    }
    return null;
  } as any);
});

// 混合父组件：第一个子组件给紧约束，第二个子组件给松约束
class TestHybridParent extends Widget {
  layoutCount = 0;

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    this.layoutCount++;
    return { width: 300, height: 300 };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    if (childIndex === 0) {
      // 子组件 A: 紧约束 -> 成为边界
      return createTightConstraints(100, 100);
    } else {
      // 子组件 B: 松约束 -> 非边界（相对于此组件）
      return { minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 };
    }
  }
}

// 松散父组件：给所有子组件松约束
class TestLooseParent extends Widget {
  layoutCount = 0;

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    this.layoutCount++;
    return { width: 100, height: 100 };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    return { minWidth: 0, maxWidth: 100, minHeight: 0, maxHeight: 100 };
  }
}

class TestLeaf extends Widget {
  layoutCount = 0;

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    this.layoutCount++;
    return { width: 50, height: 50 };
  }
}

WidgetRegistry.registerType('TestHybridParent', TestHybridParent);
WidgetRegistry.registerType('TestLooseParent', TestLooseParent);
WidgetRegistry.registerType('TestLeaf', TestLeaf);

describe('PipelineOwner 嵌套边界', () => {
  const containerId = 'app-nested';
  let runtime: Runtime;

  beforeAll(async () => {
    const div = document.createElement('div');
    div.id = containerId;
    document.body.appendChild(div);
    runtime = await Runtime.create(containerId);
  });

  afterAll(() => {
    runtime.destroy();
    document.body.innerHTML = '';
  });

  it('应在嵌套边界内隔离更新', async () => {
    // 结构:
    // 根节点 (TestHybridParent)
    //   -> 子组件 A (TestLooseParent) [边界]
    //      -> 孙组件 A1 (TestLeaf) [非边界]
    //   -> 子组件 B (TestLooseParent) [非边界]
    //      -> 孙组件 B1 (TestLeaf) [非边界]

    await runtime.render(
      <TestHybridParent key="root">
        <TestLooseParent key="childA">
          <TestLeaf key="leafA1" />
        </TestLooseParent>
        <TestLooseParent key="childB">
          <TestLeaf key="leafB1" />
        </TestLooseParent>
      </TestHybridParent>,
    );

    // 获取组件实例
    const root = (runtime as any).rootWidget as TestHybridParent;
    const childA = root.children[0] as TestLooseParent;
    const childB = root.children[1] as TestLooseParent;
    const leafA1 = childA.children[0] as TestLeaf;
    const leafB1 = childB.children[0] as TestLeaf;

    // 验证初始边界状态
    expect(root.isRelayoutBoundary).toBe(true); // 根节点总是边界
    expect(childA.isRelayoutBoundary).toBe(true); // 紧约束
    expect(childB.isRelayoutBoundary).toBe(false); // 松约束
    expect(leafA1.isRelayoutBoundary).toBe(false); // 相对于 A 是松散的
    expect(leafB1.isRelayoutBoundary).toBe(false); // 相对于 B 是松散的

    // 重置计数
    root.layoutCount = 0;
    childA.layoutCount = 0;
    childB.layoutCount = 0;
    leafA1.layoutCount = 0;
    leafB1.layoutCount = 0;

    // 场景 1: 更新孙组件 A1 (在边界 A 内)
    // 应标记 leafA1 -> childA 为脏。在 childA 处停止。
    leafA1.markNeedsLayout();

    await runtime.rebuild();

    expect(leafA1.layoutCount).toBe(1);
    expect(childA.layoutCount).toBe(1);
    expect(root.layoutCount).toBe(0); // 不应布局
    expect(childB.layoutCount).toBe(0); // 不应布局
    expect(leafB1.layoutCount).toBe(0);

    // 场景 2: 更新孙组件 B1 (在非边界 B 内)
    // 应标记 leafB1 -> childB -> Root 为脏。在 Root 处停止。
    leafB1.markNeedsLayout();

    await runtime.rebuild();

    expect(leafB1.layoutCount).toBe(1);
    expect(childB.layoutCount).toBe(1);
    expect(root.layoutCount).toBe(1); // 应布局

    expect(childA.layoutCount).toBe(1); // 计数不应增加 (原为 1)
  });
});
