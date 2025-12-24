import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MindMapNodeToolbar } from '../mindmap-node-toolbar';
import { CustomComponentType } from '../type';

import type { InkwellEvent } from '@/core/events';

import { Widget, type BoxConstraints, type Size, type WidgetProps } from '@/core/base';

// 模拟 Viewport 类以模拟属性
class MockViewport extends Widget {
  scale: number = 1;
  tx: number = 0;
  ty: number = 0;
  _scrollX: number = 0;
  _scrollY: number = 0;

  constructor(props: WidgetProps) {
    super({ ...props, type: CustomComponentType.MindMapViewport });
    this.renderObject.offset = { dx: 0, dy: 0 };
    this.renderObject.size = { width: 800, height: 600 };
  }

  protected performLayout(constraints: BoxConstraints): Size {
    return { width: 800, height: 600 };
  }
}

// 模拟 Node 类
class MockNode extends Widget {
  constructor(props: WidgetProps) {
    super({ ...props, type: CustomComponentType.MindMapNode });
    this.renderObject.size = { width: 100, height: 50 };
  }

  protected performLayout(constraints: BoxConstraints): Size {
    return { width: 100, height: 50 };
  }
}

// 模拟 Root 以保持结构
class MockRoot extends Widget {
  constructor() {
    super({ type: 'Root', children: [] });
  }

  protected performLayout(constraints: BoxConstraints): Size {
    return { width: 1000, height: 1000 };
  }
}

describe('MindMapNodeToolbar 命中测试与交互', () => {
  let root: MockRoot;
  let viewport: MockViewport;
  let node: MockNode;
  let toolbar: MindMapNodeToolbar;
  let onAddSiblingSpy: any;
  let onAddChildSideSpy: any;

  beforeEach(() => {
    root = new MockRoot();
    viewport = new MockViewport({ key: 'vp' });
    // Node 需要 active: true 以便 findWidget(':active') 查找
    node = new MockNode({ key: 'node-1', active: true });

    onAddSiblingSpy = vi.fn();
    onAddChildSideSpy = vi.fn();

    // Toolbar 需要 activeKey 匹配 node
    toolbar = new MindMapNodeToolbar({
      type: CustomComponentType.MindMapNodeToolbar,
      activeKey: 'node-1',
      // 模拟回调
      onAddSibling: onAddSiblingSpy,
      onAddChildSide: onAddChildSideSpy,
    });

    // 构建树：Root -> Viewport -> [Node, Toolbar]
    root.children = [viewport];
    viewport.parent = root;

    viewport.children = [node, toolbar];
    node.parent = viewport;
    toolbar.parent = viewport;

    // 设置 Node 位置（相对于 Viewport 未缩放）
    node.renderObject.offset = { dx: 100, dy: 100 };

    // 手动设置 Toolbar 大小（因为没有运行布局）
    toolbar.renderObject.size = { width: 800, height: 600 };
  });

  // 测试布局坐标下的 hitTest（假设框架在调用 hitTest 前转换坐标）
  it('hitTest 应在任何缩放比例下使用布局坐标工作', () => {
    viewport.scale = 2;
    viewport.tx = 50;
    viewport.ty = 50;

    // Node 布局位置: (100, 100)
    // 右侧按钮布局位置: 206, 115
    // hitTest 期望布局坐标

    const hit = toolbar.hitTest(210, 120);
    expect(hit).toBe(true);

    const miss = toolbar.hitTest(200, 120);
    expect(miss).toBe(false);
  });

  // 测试屏幕坐标下的 onPointerDown（真实用户交互）
  it('onPointerDown 应在缩放时处理屏幕坐标', () => {
    viewport.scale = 2;
    viewport.tx = 0;
    viewport.ty = 0;

    // 右侧按钮布局位置: 206, 115
    // 屏幕位置 (Scale=2): 412, 230
    // 中心屏幕位置: 412 + 10 = 422, 230 + 10 = 240 (约)

    // 模拟屏幕坐标事件
    const event = {
      x: 422,
      y: 240,
      stopPropagation: vi.fn(),
      target: toolbar,
    } as unknown as InkwellEvent;

    toolbar.onPointerDown(event);

    // 应触发回调
    // 右侧按钮触发 addChildRight 或 addSibling，取决于上下文？
    // 在默认设置（根节点？）中，可能不同。
    // 让我们检查代码中的 resolveSides 逻辑：
    // 如果是 Root (!edge)，允许: ['left', 'right']
    // 右侧按钮 -> addChildRight

    expect(onAddChildSideSpy).toHaveBeenCalled();
  });

  it('onPointerDown 应在平移时处理屏幕坐标', () => {
    viewport.scale = 1;
    viewport.tx = 50;
    viewport.ty = 50;

    // 右侧按钮布局位置: 206, 115
    // 屏幕位置 = Layout + Tx = 256, 165
    // 点击位置 266, 175

    const event = {
      x: 266,
      y: 175,
      stopPropagation: vi.fn(),
      target: toolbar,
    } as unknown as InkwellEvent;

    toolbar.onPointerDown(event);
    expect(onAddChildSideSpy).toHaveBeenCalled();
  });
});
