import { beforeAll, describe, expect, it } from 'vitest';

import { Connector } from '../connector';
import { MindMapNode } from '../mindmap-node';
import { CustomComponentType } from '../type';
import { Viewport } from '../viewport';

import { Widget, type BoxConstraints, type Size } from '@/core/base';
import { findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';

// Helper to create widget tree recursively
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

// Register custom widgets
beforeAll(() => {
  WidgetRegistry.registerType(CustomComponentType.Viewport, Viewport);
  WidgetRegistry.registerType(CustomComponentType.MindMapNode, MindMapNode);
  WidgetRegistry.registerType(CustomComponentType.MindMapLayout, MockMindMapLayout);
  WidgetRegistry.registerType(CustomComponentType.Connector, Connector);
});

describe('Connector Cursor Configuration', () => {
  const buildTestTree = (cursorConfig?: any) => {
    const root = createWidgetTree({
      type: CustomComponentType.Viewport,
      key: 'viewport',
      nodeCursorConfig: cursorConfig,
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

    // Manually set layout positions for hit testing
    const node1 = findWidget(root, 'MindMapNode#node1') as Widget;
    node1.renderObject.offset = { dx: 0, dy: 0 };
    node1.renderObject.size = { width: 100, height: 50 };

    const node2 = findWidget(root, 'MindMapNode#node2') as Widget;
    node2.renderObject.offset = { dx: 200, dy: 0 }; // Straight line
    node2.renderObject.size = { width: 100, height: 50 };

    // Layout itself needs position 0,0 usually
    const layout = findWidget(root, 'MindMapLayout#layout') as Widget;
    layout.renderObject.offset = { dx: 0, dy: 0 };

    return root;
  };

  it('should hit test correctly on the line', () => {
    const root = buildTestTree();
    const conn = findWidget(root, 'Connector#conn1') as Connector;

    // Node1 center: 50, 25
    // Node2 center: 250, 25
    // Line from (100, 25) to (200, 25) roughly (connecting closest sides)

    const hit = conn.hitTest(150, 25);
    expect(hit).toBe(true);

    const miss = conn.hitTest(150, 100);
    expect(miss).toBe(false);
  });

  it('should use default cursor (pointer) when hovering', () => {
    const root = buildTestTree();
    const conn = findWidget(root, 'Connector#conn1') as Connector;

    conn.onPointerEnter({} as any);
    expect(conn.cursor).toBe('pointer');

    conn.onPointerLeave({} as any);
    expect(conn.cursor).toBe('default');
  });

  it('should respect global cursor config', () => {
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

  it('should respect local cursor config', () => {
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

    // Mock positions again
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
    expect(conn.cursor).toBe('text'); // local reading

    conn.onPointerLeave({} as any);
    expect(conn.cursor).toBe('wait'); // local normal
  });
});
