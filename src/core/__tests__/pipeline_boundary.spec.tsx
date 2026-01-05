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
  // 使用 spyOn 而不是直接赋值，以确保它正确覆盖 JSDOM 行为
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    contextId: string,
  ) {
    if (contextId === '2d') {
      // 将 context.canvas 指向调用 getContext 的元素
      (mockContext as any).canvas = this;
      return mockContext;
    }
    return null;
  } as any);
});

// 定义测试组件
class TestParent extends Widget {
  layoutCount = 0;

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    this.layoutCount++;
    // 逻辑从 layout() 移动而来
    // Widget.layout 在调用 performLayout 之前处理边界逻辑和 layoutChildren
    // 但是等等，Widget.layout 调用 layoutChildren，后者调用 child.layout。
    // 如果我们依赖默认的 Widget.layout，它会调用 layoutChildren(constraints)
    // 这会将父级约束传递给子级。
    // 在原始测试中，TestParent 为子级创建了紧约束。
    // 默认的 layoutChildren 传递由 getConstraintsForChild 修改后的约束。

    // 所以如果我们想要自定义约束，我们需要重写 getConstraintsForChild 或手动调用 layoutChildren。
    // 但是 performLayout 接收 childrenSizes，这意味着 layoutChildren 已经被调用了。

    // 如果我们想控制子级约束，必须重写 getConstraintsForChild。

    return { width: 200, height: 200 };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    // 为子级提供紧约束使其成为边界
    return createTightConstraints(100, 100);
  }
}

class TestLooseParent extends Widget {
  layoutCount = 0;

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    this.layoutCount++;
    return { width: 200, height: 200 };
  }

  protected getConstraintsForChild(
    constraints: BoxConstraints,
    childIndex: number,
  ): BoxConstraints {
    // 松约束
    return { minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 };
  }
}

class TestChild extends Widget {
  layoutCount = 0;

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    this.layoutCount++;
    return { width: 100, height: 100 };
  }
}

describe('PipelineOwner 与 Relayout Boundary', () => {
  const containerId = 'app';

  beforeAll(() => {
    // 模拟容器
    const div = document.createElement('div');
    div.id = containerId;
    document.body.appendChild(div);

    // 注册组件
    WidgetRegistry.registerType('TestParent', TestParent);
    WidgetRegistry.registerType('TestLooseParent', TestLooseParent);
    WidgetRegistry.registerType('TestChild', TestChild);
  });

  afterAll(() => {
    document.body.innerHTML = '';
  });

  it('Relayout Boundary 应阻止布局向上传播', async () => {
    const runtime = await Runtime.create(containerId);

    // 1. 初始渲染
    await runtime.render(
      <TestParent key="root">
        <TestChild key="child1" />
      </TestParent>,
    );

    const root = runtime.getRootWidget() as TestParent;
    const child = root.children[0] as TestChild;

    expect(root).toBeInstanceOf(TestParent);
    expect(child).toBeInstanceOf(TestChild);

    // 重置计数器（初始布局已发生）
    const initialRootCount = root.layoutCount;
    const initialChildCount = child.layoutCount;
    expect(initialRootCount).toBeGreaterThan(0);
    expect(initialChildCount).toBeGreaterThan(0);

    // 验证边界状态
    // 父级传递紧约束 (100x100)，所以子级应为边界
    expect(child['_relayoutBoundary']).toBe(child);
    expect(root['_relayoutBoundary']).toBe(root); // Root 是边界

    // 确保 PipelineOwner 是干净的，移除初始化可能残留的 dirty 节点
    runtime.pipelineOwner['_nodesNeedingLayout'].clear();

    // 2. 标记子级为脏
    child.markNeedsLayout();

    // 验证脏状态
    expect(child.isLayoutDirty()).toBe(true);
    expect(root.isLayoutDirty()).toBe(false); // 不应传播到父级

    // 验证 PipelineOwner 已调度该子级
    expect(runtime.pipelineOwner['_nodesNeedingLayout']).toContain(child);
    expect(runtime.pipelineOwner['_nodesNeedingLayout']).not.toContain(root);

    // 3. 通过 Runtime tick/rebuild 刷新布局
    // 我们可以手动触发 pipeline 刷新或使用 runtime.tick
    // Runtime.rebuild 调用 pipelineOwner.flushLayout()
    await runtime.rebuild();

    // 4. 验证布局计数
    expect(child.layoutCount).toBe(initialChildCount + 1); // 子级重新布局
    expect(root.layoutCount).toBe(initialRootCount); // 父级未重新布局

    // 清理
    runtime.destroy();
  });

  it('非 Boundary 节点应向上传播布局脏标记', async () => {
    // 创建松约束场景 - 类已移动到顶层

    const runtime = await Runtime.create(containerId);
    await runtime.render(
      <TestLooseParent key="loose-parent">
        <TestChild key="child2" />
      </TestLooseParent>,
    );

    const root = runtime.getRootWidget() as TestLooseParent;
    const child = root.children[0] as TestChild;

    // 重置计数器
    const initialRootCount = root.layoutCount;
    const initialChildCount = child.layoutCount;

    // 验证边界状态
    // 父级传递松约束，所以子级不应是边界
    // 除非父级不是边界？父级是 Root，所以父级是边界。
    // 子级的边界应为父级。
    expect(child['_relayoutBoundary']).toBe(root);

    // 标记子级为脏
    child.markNeedsLayout();

    // 验证传播
    expect(child.isLayoutDirty()).toBe(true);
    expect(root.isLayoutDirty()).toBe(true); // 应传播到父级

    // 刷新
    await runtime.rebuild();

    // 两者都应更新
    expect(root.layoutCount).toBe(initialRootCount + 1);
    expect(child.layoutCount).toBe(initialChildCount + 1);

    runtime.destroy();
  });
});
