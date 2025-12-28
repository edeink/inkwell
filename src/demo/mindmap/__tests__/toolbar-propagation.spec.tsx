/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapNodeToolbar } from '../widgets/mindmap-node-toolbar';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import { dispatchToTree } from '@/core/events';

describe('MindMapNodeToolbar 事件冒泡测试', () => {
  it('点击添加按钮时应停止事件冒泡', () => {
    const onActiveKeyChange = vi.fn();

    // 创建 Viewport
    const vp = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      activeKey: 'n1',
      onActiveKeyChange,
      width: 800,
      height: 600,
    });
    // 模拟 Toolbar 需要的 Viewport 方法
    vp.key = CustomComponentType.MindMapViewport;
    vp.renderObject = {
      offset: { dx: 0, dy: 0 },
      size: { width: 800, height: 600 },
    };

    // 创建 Toolbar
    const toolbar = new MindMapNodeToolbar({
      type: CustomComponentType.MindMapNodeToolbar,
      activeKey: 'n1',
      onAddSibling: vi.fn(),
    });
    // 模拟 Toolbar 方法/属性
    toolbar.key = 'toolbar';
    // 模拟 getActiveNode 以便 hitTest 不会在调用时失败
    // 但我们无论如何都会 mock hitToolbar。

    // 构建树
    // Viewport -> Toolbar
    // 注意：在实际应用中，Toolbar 是 Layout 的子级，但对于事件冒泡测试，直接父级是可以的
    // 只要 dispatchToTree 工作正常。
    vp.children = [toolbar];
    toolbar.parent = vp;
    // 设置 root
    (toolbar as any).__root = vp;
    (vp as any).__root = vp;

    // 模拟 hitToolbar 以模拟点击按钮
    // 我们需要将其转换为 any 以访问私有方法，或者如果它是受保护的，则直接覆盖它
    // 既然它是私有的，如果不进行转换，我们无法轻易在原型上 mock 它。
    // 但是，onPointerDown 调用 this.hitToolbar(e.x, e.y)。
    (toolbar as any).hitToolbar = () => ({ type: 'addBelow', side: 'right' });

    // 同时 mock getActiveNode，因为 optimizeViewportForNewNode 会调用它
    (toolbar as any).getActiveNode = () => ({
      key: 'n1',
      getAbsolutePosition: () => ({ dx: 100, dy: 100 }),
      renderObject: { size: { width: 100, height: 50 } },
    });

    // 派发 pointerdown 事件，模拟原生事件 buttons=1 (鼠标左键)
    dispatchToTree(vp, toolbar, 'pointerdown', 100, 100, { buttons: 1 } as any);

    // 期望 Viewport 的 onPointerDown 逻辑（清除 activeKey）不被触发
    // Viewport.onPointerDown 如果处理了事件，会调用 setActiveKey(null)
    // onActiveKeyChange 由 setActiveKey 调用
    expect(onActiveKeyChange).not.toHaveBeenCalledWith(null);
  });

  it('点击非添加按钮区域时不应停止事件冒泡', () => {
    const onActiveKeyChange = vi.fn();

    const vp = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      activeKey: 'n1',
      onActiveKeyChange,
      width: 800,
      height: 600,
    });
    vp.key = CustomComponentType.MindMapViewport;
    vp.renderObject = {
      offset: { dx: 0, dy: 0 },
      size: { width: 800, height: 600 },
    };

    const toolbar = new MindMapNodeToolbar({
      type: CustomComponentType.MindMapNodeToolbar,
      activeKey: 'n1',
      onAddSibling: vi.fn(),
    });
    vp.children = [toolbar];
    toolbar.parent = vp;
    (toolbar as any).__root = vp;
    (vp as any).__root = vp;

    // 模拟 hitToolbar 返回 null (点击了工具栏层中的空白处？)
    // 实际上工具栏通常不占用空间，但让我们假设我们“穿透”点击了它
    (toolbar as any).hitToolbar = () => null;

    dispatchToTree(vp, toolbar, 'pointerdown', 100, 100, { buttons: 1 } as any);

    // 期望 Viewport 处理它并清除 activeKey
    expect(onActiveKeyChange).toHaveBeenCalledWith(null);
  });
});
