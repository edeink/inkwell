import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';

import { MindMapNode } from '../mindmap-node';
import { MindMapNodeToolbar } from '../mindmap-node-toolbar';
import { CustomComponentType } from '../type';
import { Viewport } from '../viewport';

import { Widget } from '@/core/base';
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

// Register custom widgets
beforeAll(() => {
  WidgetRegistry.registerType(CustomComponentType.Viewport, Viewport);
  WidgetRegistry.registerType(CustomComponentType.MindMapNode, MindMapNode);
  WidgetRegistry.registerType(CustomComponentType.MindMapNodeToolbar, MindMapNodeToolbar);
});

describe('MindMapNodeToolbar Cursor', () => {
  it('should apply reading cursor (pointer) on hover', () => {
    const root = createWidgetTree({
      type: CustomComponentType.Viewport,
      key: 'viewport',
      nodeCursorConfig: {
        reading: 'pointer', // Default for buttons/reading
      },
      children: [
        {
          type: CustomComponentType.MindMapNode,
          key: 'node1',
          active: true, // Make it active so toolbar can find it
        },
        {
          type: CustomComponentType.MindMapNodeToolbar,
          key: 'toolbar',
        },
      ],
    }) as Viewport;

    const toolbar = root.children[1] as MindMapNodeToolbar;
    // Mock root property as it is used by findWidget
    // In real runtime, __root is set. Here we can manually set it or ensure findWidget works.
    // findWidget(this.root, ...) uses this.root.
    // Widget.root getter traverses up to parent until no parent.
    // Our tree structure is correct (parent links set by createWidgetTree).

    // Simulate pointer enter
    toolbar.onPointerEnter({} as any);

    expect(toolbar.cursor).toBe('pointer');
  });

  it('should use configured cursor from Viewport', () => {
    const root = createWidgetTree({
      type: CustomComponentType.Viewport,
      key: 'viewport',
      nodeCursorConfig: {
        reading: 'help', // Custom cursor for reading/buttons
      },
      children: [
        {
          type: CustomComponentType.MindMapNode,
          key: 'node1',
          active: true,
        },
        {
          type: CustomComponentType.MindMapNodeToolbar,
          key: 'toolbar',
        },
      ],
    }) as Viewport;

    const toolbar = root.children[1] as MindMapNodeToolbar;

    // Simulate pointer enter
    toolbar.onPointerEnter({} as any);

    expect(toolbar.cursor).toBe('help');
  });

  it('should reset cursor on pointer leave', () => {
    const root = createWidgetTree({
      type: CustomComponentType.Viewport,
      key: 'viewport',
      children: [
        {
          type: CustomComponentType.MindMapNode,
          key: 'node1',
          active: true,
        },
        {
          type: CustomComponentType.MindMapNodeToolbar,
          key: 'toolbar',
        },
      ],
    }) as Viewport;

    const toolbar = root.children[1] as MindMapNodeToolbar;

    // Enter
    toolbar.onPointerEnter({} as any);
    expect(toolbar.cursor).toBe('pointer'); // Default fallback

    // Leave
    toolbar.onPointerLeave({} as any);
    expect(toolbar.cursor).toBeUndefined();
  });
});
