import { beforeAll, describe, expect, it, vi } from 'vitest';

import { MindMapNode } from '../mindmap-node';
import { CustomComponentType } from '../type';
import { Viewport } from '../viewport';

import { Widget } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';

// Helper to create widget tree recursively
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

// Register custom widgets
beforeAll(() => {
  WidgetRegistry.registerType(CustomComponentType.Viewport, Viewport);
  WidgetRegistry.registerType(CustomComponentType.MindMapNode, MindMapNode);
});

// Mock context
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

describe('MindMapNode Cursor Configuration', () => {
  it('should use default cursor styles when no config provided', () => {
    const root = createWidgetTree({
      type: CustomComponentType.Viewport,
      key: 'viewport',
      children: [
        {
          type: CustomComponentType.MindMapNode,
          key: 'node1',
          title: 'Node 1',
        },
      ],
    });

    // Mount
    // root!.build(mockContext);

    const node = (root as any).children[0] as MindMapNode;
    // Need to trigger build/render to get the container
    const container = node.render() as any;

    // Default normal state
    expect(container.props.cursor).toBe('default');
  });

  it('should use global configuration from Viewport', () => {
    const root = createWidgetTree({
      type: CustomComponentType.Viewport,
      key: 'viewport',
      nodeCursorConfig: {
        normal: 'help',
        editing: 'wait',
        reading: 'move',
      },
      children: [
        {
          type: CustomComponentType.MindMapNode,
          key: 'node1',
          title: 'Node 1',
        },
      ],
    });

    // root!.build(mockContext);
    const node = (root as any).children[0] as MindMapNode;

    // Normal state
    let container = node.render() as any;
    expect(container.props.cursor).toBe('help');

    // Editing state
    node.setState({ isEditing: true });
    container = node.render() as any;
    expect(container.props.cursor).toBe('wait');

    // Hovering (Reading) state
    node.setState({ isEditing: false, hovering: true });
    container = node.render() as any;
    expect(container.props.cursor).toBe('move');
  });

  it('should use local configuration overriding global', () => {
    const root = createWidgetTree({
      type: CustomComponentType.Viewport,
      key: 'viewport',
      nodeCursorConfig: {
        normal: 'help',
      },
      children: [
        {
          type: CustomComponentType.MindMapNode,
          key: 'node1',
          title: 'Node 1',
          cursorConfig: {
            normal: 'pointer',
          },
        },
      ],
    });

    // root!.build(mockContext);
    const node = (root as any).children[0] as MindMapNode;

    // Normal state (local override)
    const container = node.render() as any;
    expect(container.props.cursor).toBe('pointer');
  });

  it('should fallback to defaults if config is partial', () => {
    const root = createWidgetTree({
      type: CustomComponentType.Viewport,
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
