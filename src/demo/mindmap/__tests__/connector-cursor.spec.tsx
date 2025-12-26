import { beforeAll, describe, expect, it } from 'vitest';

import { CustomComponentType } from '../type';
import { Connector } from '../widgets/connector';
import { MindMapNode } from '../widgets/mindmap-node';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import { Widget, type BoxConstraints, type Size } from '@/core/base';
import { findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';

// 递归创建 widget 树的辅助函数
function createWidgetTree(data: any): Widget {
  const widget = WidgetRegistry.createWidget(data)!;
  if (data.children && Array.isArray(data.children)) {
    widget.children = data.children.map((childData: any) => {
      const child = createWidgetTree(childData);
      child.parent = widget;
      return child;
    });
  }
  return widget;
}

class MockMindMapLayout extends Widget {
  constructor(data: any) {
    super(data);
    this.type = CustomComponentType.MindMapLayout;
  }
  protected performLayout(_constraints: BoxConstraints, _childrenSizes: Size[]): Size {
    return { width: 0, height: 0 };
  }
}

// 注册自定义 widget
beforeAll(() => {
  WidgetRegistry.registerType(CustomComponentType.MindMapViewport, MindMapViewport);
  WidgetRegistry.registerType(CustomComponentType.MindMapNode, MindMapNode);
  WidgetRegistry.registerType(CustomComponentType.MindMapLayout, MockMindMapLayout);
  WidgetRegistry.registerType(CustomComponentType.Connector, Connector);
});

describe('Connector 光标配置', () => {
  const buildTestTree = () => {
    const root = createWidgetTree({
      type: CustomComponentType.MindMapViewport,
      key: 'viewport',
      children: [
        {
          type: CustomComponentType.MindMapLayout,
          key: 'layout',
          children: [
            {
              type: CustomComponentType.MindMapNode,
              key: 'node1',
              title: 'Node 1',
            },
            {
              type: CustomComponentType.MindMapNode,
              key: 'node2',
              title: 'Node 2',
            },
            {
              type: CustomComponentType.Connector,
              key: 'conn1',
              fromKey: 'node1',
              toKey: 'node2',
            },
          ],
        },
      ],
    });

    // 手动设置布局位置用于命中测试
    const node1 = findWidget(root, `${CustomComponentType.MindMapNode}#node1`) as Widget;
    node1.renderObject.offset = { dx: 0, dy: 0 };
    node1.renderObject.size = { width: 100, height: 50 };

    const node2 = findWidget(root, `${CustomComponentType.MindMapNode}#node2`) as Widget;
    node2.renderObject.offset = { dx: 200, dy: 0 }; // 直线
    node2.renderObject.size = { width: 100, height: 50 };

    // 布局本身通常需要位置 0,0
    const layout = findWidget(root, `${CustomComponentType.MindMapLayout}#layout`) as Widget;
    layout.renderObject.offset = { dx: 0, dy: 0 };

    return root;
  };

  it('应在线条上正确进行命中测试', () => {
    const root = buildTestTree();
    const conn = findWidget(root, `${CustomComponentType.Connector}#conn1`) as Connector;

    // Node1 中心: 50, 25
    // Node2 中心: 250, 25
    // 连线大致从 (100, 25) 到 (200, 25) (连接最近的边)

    const hit = conn.hitTest(150, 25);
    expect(hit).toBe(true);

    const miss = conn.hitTest(150, 100);
    expect(miss).toBe(false);
  });

  // TODO: Connector 组件目前尚未实现内部悬停状态管理 (onPointerEnter/Leave)。
  // 在功能实现之前，这些测试暂时禁用。
  /*
  it('悬停时应使用默认光标 (pointer)', () => {
    const root = buildTestTree();
    const conn = findWidget(root, 'Connector#conn1') as Connector;

    conn.onPointerEnter({} as any);
    expect(conn.cursor).toBe('pointer');

    conn.onPointerLeave({} as any);
    expect(conn.cursor).toBe('default');
  });

  it('应遵循全局光标配置', () => {
    const root = buildTestTree({
      normal: 'help',
      reading: 'crosshair',
    });
    const conn = findWidget(root, 'Connector#conn1') as Connector;

    conn.onPointerEnter({} as any);
    expect(conn.cursor).toBe('crosshair');

    conn.onPointerLeave({} as any);
    expect(conn.cursor).toBe('help');
  });

  it('应遵循局部光标配置', () => {
    const root = createWidgetTree({
      type: CustomComponentType.Viewport,
      key: 'viewport',
      children: [
        {
          type: CustomComponentType.MindMapLayout,
          key: 'layout',
          children: [
            { type: CustomComponentType.MindMapNode, key: 'node1', title: 'N1' },
            { type: CustomComponentType.MindMapNode, key: 'node2', title: 'N2' },
            {
              type: CustomComponentType.Connector,
              key: 'conn1',
              fromKey: 'node1',
              toKey: 'node2',
              cursorConfig: {
                normal: 'wait',
                reading: 'text',
              },
            },
          ],
        },
      ],
    });

    // 再次模拟位置
    const node1 = findWidget(root, 'MindMapNode#node1') as Widget;
    node1.renderObject.offset = { dx: 0, dy: 0 };
    node1.renderObject.size = { width: 100, height: 50 };
    const node2 = findWidget(root, 'MindMapNode#node2') as Widget;
    node2.renderObject.offset = { dx: 200, dy: 0 };
    node2.renderObject.size = { width: 100, height: 50 };
    const layout = findWidget(root, 'MindMapLayout#layout') as Widget;
    layout.renderObject.offset = { dx: 0, dy: 0 };

    const conn = findWidget(root, 'Connector#conn1') as Connector;

    conn.onPointerEnter({} as any);
    expect(conn.cursor).toBe('text'); // 局部 reading

    conn.onPointerLeave({} as any);
    expect(conn.cursor).toBe('wait'); // 局部 normal
  });
  */
});
