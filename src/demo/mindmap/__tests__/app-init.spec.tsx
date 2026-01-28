/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { MindmapDemo } from '../app';

import { Widget } from '@/core';
import Runtime from '@/runtime';

// Mock runtime
function createMockRuntime() {
  let rootWidget: any = null;
  const runtime = {
    pipelineOwner: {
      scheduleLayoutFor: vi.fn(),
      schedulePaintFor: vi.fn(),
    },
    scheduleUpdate: vi.fn(),
    getRenderer: () => ({
      drawText: vi.fn(),
      measureText: () => ({ width: 10 }),
    }),
    getRootWidget: () => rootWidget,
    setRootWidget: (w: any) => {
      rootWidget = w;
    },
  } as unknown as Runtime;
  return runtime;
}

function findFirstByType(root: Widget | null | undefined, type: string): Widget | null {
  if (!root) {
    return null;
  }
  if ((root as any).type === type) {
    return root as any;
  }
  const children = (root as any).children as Widget[] | undefined;
  if (!children || children.length === 0) {
    return null;
  }
  for (const child of children) {
    const found = findFirstByType(child, type);
    if (found) {
      return found;
    }
  }
  return null;
}

describe('Mindmap App 初始化流程', () => {
  it('MindmapDemo 应正确初始化并挂载', () => {
    const runtime = createMockRuntime();
    const app = new MindmapDemo({ width: 800, height: 600 });

    // Set root widget for the mock
    (runtime as any).setRootWidget(app);

    // 模拟挂载过程
    // 在真实 Runtime 中，render 会设置 rootWidget 并调用 createElement
    // 这里我们手动模拟部分流程
    app.runtime = runtime;
    app.createElement(app.data);

    // 验证状态
    expect(app).toBeDefined();
    expect(app.isMounted).toBe(true);

    // 验证子组件创建
    // MindmapDemo render 返回 MindMapViewport
    // createElement 会触发 build -> render
    // 但在测试中，我们需要检查 app.children
    expect(app.children.length).toBeGreaterThan(0);
    const viewport = findFirstByType(app, 'MindMapViewport');
    expect(viewport).toBeDefined();
    expect(viewport?.type).toBe('MindMapViewport');

    // 验证 Viewport 也已挂载
    expect(viewport?.isMounted).toBe(true);
    expect(viewport?.owner).toBeDefined();
  });

  it('组件创建后立即挂载，防止游离状态', () => {
    // 这个测试验证我们在 base.ts 和 text.ts 中的修改
    // 即创建组件时不应立即触发 layout 警告

    const consoleSpy = vi.spyOn(console, 'warn');

    // 创建一个 Widget (模拟 Text 或其他)
    // 此时它没有 parent，也没有 owner (未挂载)
    class TestWidget extends Widget {
      constructor() {
        super({});
        // 模拟在构造函数中修改属性触发 layout
        this.markNeedsLayout();
      }
    }

    const w = new TestWidget();

    // 此时不应有警告，因为 markParentNeedsLayout 抑制了未挂载节点的警告
    expect(consoleSpy).not.toHaveBeenCalled();

    // 确认状态
    expect((w as any)._needsLayout).toBe(true);
    expect(w.isMounted).toBe(false);

    consoleSpy.mockRestore();
  });
});
