import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapNodeToolbar } from '../widgets/mindmap-node-toolbar';

import type { InkwellEvent } from '@/core/events';

import { Widget, type BoxConstraints, type Size, type WidgetProps } from '@/core/base';
import { multiply, transformPoint } from '@/core/helper/transform';
import { WidgetRegistry } from '@/core/registry';

// 模拟 Viewport 类以模拟属性
class MockViewport extends Widget {
  scale: number = 1;
  tx: number = 0;
  ty: number = 0;
  _scrollX: number = 0;
  _scrollY: number = 0;

  constructor(props: WidgetProps) {
    super({ ...props });
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
    super({ ...props });
    this.renderObject.size = { width: 100, height: 50 };
  }

  protected performLayout(constraints: BoxConstraints): Size {
    return { width: 100, height: 50 };
  }
}

// 模拟 Root 以保持结构
class MockRoot extends Widget {
  constructor() {
    super({ children: [] });
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
    WidgetRegistry.registerType(CustomComponentType.MindMapViewport, MockViewport);
    viewport = new MockViewport({ key: 'vp', type: CustomComponentType.MindMapViewport });
    // Node 需要 active: true 以便 findWidget(':active') 查找
    node = new MockNode({ key: 'node-1', active: true });

    onAddSiblingSpy = vi.fn();
    onAddChildSideSpy = vi.fn();

    // Toolbar 需要 activeKey 匹配 node
    toolbar = new MindMapNodeToolbar({
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
    // 模拟 Viewport 变换
    const scale = 2;
    const tx = 50;
    const ty = 50;
    viewport.scale = scale;
    viewport.tx = tx;
    viewport.ty = ty;

    // 设置 Toolbar 的 World Matrix (继承 Viewport)
    const vpMatrix: [number, number, number, number, number, number] = [scale, 0, 0, scale, tx, ty];
    (toolbar as any)._worldMatrix = vpMatrix;

    // 设置 Node 的 World Matrix (Viewport * Local)
    // Node Local: translate(100, 100)
    const nodeLocalMatrix: [number, number, number, number, number, number] = [
      1, 0, 0, 1, 100, 100,
    ];
    (node as any)._worldMatrix = multiply(vpMatrix, nodeLocalMatrix);

    const btnSize = 20;
    const margin = 6;
    const nodeRect = { x: 100, y: 100, width: 100, height: 50 };
    const localHit = {
      x: nodeRect.x + nodeRect.width + margin + btnSize / 2,
      y: nodeRect.y + nodeRect.height / 2,
    };
    const screenHit = transformPoint(vpMatrix, localHit);

    const hit = toolbar.hitTest(screenHit.x, screenHit.y);
    expect(hit).toBe(true);

    const screenMiss = transformPoint(vpMatrix, { x: 10, y: 10 });
    const miss = toolbar.hitTest(screenMiss.x, screenMiss.y);
    expect(miss).toBe(false);
  });

  // 测试屏幕坐标下的 onPointerDown（真实用户交互）
  it('onPointerDown 应在缩放时处理屏幕坐标', () => {
    const s = 2;
    viewport.scale = s;
    viewport.tx = 0;
    viewport.ty = 0;

    const vpMatrix: [number, number, number, number, number, number] = [s, 0, 0, s, 0, 0];
    (toolbar as any)._worldMatrix = vpMatrix;
    const nodeLocalMatrix: [number, number, number, number, number, number] = [
      1, 0, 0, 1, 100, 100,
    ];
    (node as any)._worldMatrix = multiply(vpMatrix, nodeLocalMatrix);

    const btnSize = 20;
    const margin = 6;
    const nodeRect = { x: 100, y: 100, width: 100, height: 50 };
    const localHit = {
      x: nodeRect.x + nodeRect.width + margin + btnSize / 2,
      y: nodeRect.y + nodeRect.height / 2,
    };
    const screenHit = transformPoint(vpMatrix, localHit);

    const event = {
      x: screenHit.x,
      y: screenHit.y,
      stopPropagation: vi.fn(),
      target: toolbar,
    } as unknown as InkwellEvent;

    toolbar.onPointerDown(event);

    // 应触发回调
    expect(onAddChildSideSpy).toHaveBeenCalled();
  });

  it('onPointerDown 应在平移时处理屏幕坐标', () => {
    viewport.scale = 1;
    viewport.tx = 50;
    viewport.ty = 50;

    const vpMatrix: [number, number, number, number, number, number] = [1, 0, 0, 1, 50, 50];
    (toolbar as any)._worldMatrix = vpMatrix;
    const nodeLocalMatrix: [number, number, number, number, number, number] = [
      1, 0, 0, 1, 100, 100,
    ];
    (node as any)._worldMatrix = multiply(vpMatrix, nodeLocalMatrix);

    const btnSize = 20;
    const margin = 6;
    const nodeRect = { x: 100, y: 100, width: 100, height: 50 };
    const localHit = {
      x: nodeRect.x + nodeRect.width + margin + btnSize / 2,
      y: nodeRect.y + nodeRect.height / 2,
    };
    const screenHit = transformPoint(vpMatrix, localHit);

    const event = {
      x: screenHit.x,
      y: screenHit.y,
      stopPropagation: vi.fn(),
      target: toolbar,
    } as unknown as InkwellEvent;

    toolbar.onPointerDown(event);
    expect(onAddChildSideSpy).toHaveBeenCalled();
  });
});
