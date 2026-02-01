import { beforeAll, describe, expect, it } from 'vitest';

import { ConnectorStyle } from '../helpers/connection-drawer';
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
              style: ConnectorStyle.Straight,
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

  it('缩放更新时不应因矩阵滞后导致连线计算异常', () => {
    const root = buildTestTree() as unknown as MindMapViewport;
    const layout = findWidget(root, `${CustomComponentType.MindMapLayout}#layout`) as Widget;
    const conn = findWidget(root, `${CustomComponentType.Connector}#conn1`) as Connector;
    const node1 = findWidget(root, `${CustomComponentType.MindMapNode}#node1`) as Widget;
    const node2 = findWidget(root, `${CustomComponentType.MindMapNode}#node2`) as Widget;

    conn.zIndex = -1;
    node1.zIndex = 0;
    node2.zIndex = 0;

    root.setTransform(1, 0, 0);

    const renderer1 = {
      save() {},
      restore() {},
      translate() {},
      scale() {},
      rotate() {},
      transform() {},
      drawPath() {},
      drawRect() {},
      drawText() {},
      drawRRect() {},
      drawImage() {},
      setLineDash() {},
      clipRect() {},
      clearRect() {},
    } as any;

    root.paint({ renderer: renderer1 } as any);

    root.setTransform(2, 100, 100);

    let points: { x: number; y: number }[] | null = null;
    const renderer2 = {
      ...renderer1,
      drawPath(payload: { points: { x: number; y: number }[] }) {
        points = payload.points;
      },
    } as any;

    root.paint({ renderer: renderer2 } as any);

    expect(points).not.toBeNull();
    expect(points![0]).toEqual({ x: 106, y: 25 });
    expect(points![points!.length - 1]).toEqual({ x: 194, y: 25 });
    expect(layout).toBeTruthy();
  });
});
