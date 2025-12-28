import { describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../../type';
import { MindMapNodeToolbar } from '../mindmap-node-toolbar';
import { MindMapViewport } from '../mindmap-viewport';

import { dispatchToTree } from '@/core/events';

describe('MindMapNodeToolbar Interaction & Propagation', () => {
  it('当点击添加按钮时：应停止冒泡并阻止默认行为', () => {
    const onActiveKeyChange = vi.fn();
    const onAddSibling = vi.fn();

    // 1. 创建 Viewport (作为父容器)
    const vp = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      activeKey: 'n1',
      onActiveKeyChange,
      width: 800,
      height: 600,
    });
    // Mock Viewport layout props
    vp.renderObject = {
      offset: { dx: 0, dy: 0 },
      size: { width: 800, height: 600 },
    };

    // 2. 创建 Toolbar
    const toolbar = new MindMapNodeToolbar({
      type: CustomComponentType.MindMapNodeToolbar,
      activeKey: 'n1',
      onAddSibling,
    });
    // Mock Toolbar methods
    (toolbar as any).getActiveNode = () => ({
      key: 'n1',
      getAbsolutePosition: () => ({ dx: 100, dy: 100 }),
      renderObject: { size: { width: 100, height: 50 } },
    });
    // Mock hitToolbar to return a valid hit (simulation of clicking 'addBelow')
    (toolbar as any).hitToolbar = () => ({ type: 'addBelow', side: 'right' });
    // Mock optimizeViewportForNewNode to avoid complex logic
    (toolbar as any).optimizeViewportForNewNode = vi.fn();

    // 3. 构建组件树结构
    vp.children = [toolbar];
    toolbar.parent = vp;
    (toolbar as any).__root = vp;
    (vp as any).__root = vp;

    // 4. 构造 Mock 事件
    const preventDefault = vi.fn();
    const mockNativeEvent = {
      preventDefault,
      buttons: 1,
    };

    // 5. 派发事件
    // dispatchToTree 会模拟事件捕获和冒泡流程
    dispatchToTree(vp, toolbar, 'pointerdown', 100, 100, mockNativeEvent as any);

    // 6. 验证逻辑

    // 验证 A: Toolbar 的业务逻辑被触发
    expect(onAddSibling).toHaveBeenCalledWith('n1', 1, 'right');

    // 验证 B: preventDefault 被调用 (修复的核心点：防止焦点丢失)
    expect(preventDefault).toHaveBeenCalled();

    // 验证 C: 冒泡被停止，Viewport 不应收到事件 (即不应清除 activeKey)
    expect(onActiveKeyChange).not.toHaveBeenCalled();
  });

  it('当点击工具栏非按钮区域时：应允许冒泡', () => {
    const onActiveKeyChange = vi.fn();

    const vp = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      activeKey: 'n1',
      onActiveKeyChange,
      width: 800,
      height: 600,
    });
    vp.renderObject = {
      offset: { dx: 0, dy: 0 },
      size: { width: 800, height: 600 },
    };

    const toolbar = new MindMapNodeToolbar({
      type: CustomComponentType.MindMapNodeToolbar,
      activeKey: 'n1',
    });
    vp.children = [toolbar];
    toolbar.parent = vp;
    (toolbar as any).__root = vp;
    (vp as any).__root = vp;

    // Mock hitToolbar returning null (missed button)
    (toolbar as any).hitToolbar = () => null;
    (toolbar as any).getActiveNode = () => ({
      key: 'n1',
      getAbsolutePosition: () => ({ dx: 100, dy: 100 }),
      renderObject: { size: { width: 100, height: 50 } },
    });

    const preventDefault = vi.fn();
    const mockNativeEvent = {
      preventDefault,
      buttons: 1,
    };

    dispatchToTree(vp, toolbar, 'pointerdown', 100, 100, mockNativeEvent as any);

    // 验证: 冒泡未停止，Viewport 处理事件并清除 activeKey
    expect(onActiveKeyChange).toHaveBeenCalledWith(null);
    // 验证: 既然没命中按钮，就不应调用 preventDefault (或者取决于实现，这里主要关注冒泡)
    // 根据当前实现，只有 hit 为真时才调用 stopPropagation/preventDefault
  });
});
