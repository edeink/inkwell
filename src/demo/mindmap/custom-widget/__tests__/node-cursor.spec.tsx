import { beforeAll, describe, expect, it, vi } from 'vitest';

import { MindMapNode } from '../mindmap-node';
import { MindMapViewport } from '../mindmap-viewport';
import { CustomComponentType } from '../type';

import { Widget } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';

// 递归创建 widget 树的辅助函数
function createWidgetTree(data: any): Widget {
  const widget = WidgetRegistry.createWidget(data)!;
  if (data.children && Array.isArray(data.children)) {
    console.log(`Processing children for ${data.key}:`, data.children.length);
    widget.children = data.children.map((childData: any) => {
      const child = createWidgetTree(childData);
      child.parent = widget;
      return child;
    });
    console.log(`Assigned children to ${data.key}:`, widget.children.length);
  }
  return widget;
}

// 注册自定义 widget
beforeAll(() => {
  WidgetRegistry.registerType(CustomComponentType.MindMapViewport, MindMapViewport);
  WidgetRegistry.registerType(CustomComponentType.MindMapNode, MindMapNode);
});

// 模拟上下文
const mockContext = {
  renderer: {
    measureText: () => ({ width: 10, height: 10 }),
    drawText: vi.fn(),
    drawRect: vi.fn(),
    drawLine: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  },
} as any;

describe('MindMapNode 光标配置', () => {
  it('未提供配置时应使用默认光标样式', () => {
    const root = createWidgetTree({
      type: CustomComponentType.MindMapViewport,
      key: 'viewport',
      children: [
        {
          type: CustomComponentType.MindMapNode,
          key: 'node1',
          title: 'Node 1',
        },
      ],
    });

    // 挂载
    // root!.build(mockContext);

    const node = (root as any).children[0] as MindMapNode;
    // 需要触发 build/render 来获取容器
    const container = node.render() as any;

    // 默认普通状态
    expect(container.props.cursor).toBe('default');
  });

  it('should fallback to defaults if config is partial', () => {
    const root = createWidgetTree({
      type: CustomComponentType.MindMapViewport,
      key: 'viewport',
      children: [
        {
          type: CustomComponentType.MindMapNode,
          key: 'node1',
          title: 'Node 1',
          cursorConfig: {
            // Only override normal
            normal: 'grab',
          },
        },
      ],
    });

    // root!.build(mockContext);
    const node = (root as any).children[0] as MindMapNode;

    // Normal state
    let container = node.render() as any;
    expect(container.props.cursor).toBe('grab');

    // Editing state (fallback to default 'text')
    node.setState({ isEditing: true });
    container = node.render() as any;
    expect(container.props.cursor).toBe('text');
  });
});
