import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MindMapNodeToolbar } from '../mindmap-node-toolbar';
import { CustomComponentType } from '../type';

import type { InkwellEvent } from '@/core/events';

import { Widget, type BoxConstraints, type Size, type WidgetProps } from '@/core/base';

// Mock Viewport class to simulate properties
class MockViewport extends Widget {
  scale: number = 1;
  tx: number = 0;
  ty: number = 0;
  _contentTx: number = 0;
  _contentTy: number = 0;

  constructor(props: WidgetProps) {
    super({ ...props, type: 'Viewport' });
    this.renderObject.offset = { dx: 0, dy: 0 };
    this.renderObject.size = { width: 800, height: 600 };
  }

  protected performLayout(constraints: BoxConstraints): Size {
    return { width: 800, height: 600 };
  }
}

// Mock Node class
class MockNode extends Widget {
  constructor(props: WidgetProps) {
    super({ ...props, type: CustomComponentType.MindMapNode });
    this.renderObject.size = { width: 100, height: 50 };
  }

  protected performLayout(constraints: BoxConstraints): Size {
    return { width: 100, height: 50 };
  }
}

// Mock Root to hold structure
class MockRoot extends Widget {
  constructor() {
    super({ type: 'Root', children: [] });
  }

  protected performLayout(constraints: BoxConstraints): Size {
    return { width: 1000, height: 1000 };
  }
}

describe('MindMapNodeToolbar Hit Test & Interaction', () => {
  let root: MockRoot;
  let viewport: MockViewport;
  let node: MockNode;
  let toolbar: MindMapNodeToolbar;
  let onAddSiblingSpy: any;
  let onAddChildSideSpy: any;

  beforeEach(() => {
    root = new MockRoot();
    viewport = new MockViewport({ key: 'vp' });
    // Node needs active: true for findWidget(':active')
    node = new MockNode({ key: 'node-1', active: true });

    onAddSiblingSpy = vi.fn();
    onAddChildSideSpy = vi.fn();

    // Toolbar needs activeKey matching node
    toolbar = new MindMapNodeToolbar({
      type: 'MindMapNodeToolbar',
      activeKey: 'node-1',
      // Mock callbacks
      onAddSibling: onAddSiblingSpy,
      onAddChildSide: onAddChildSideSpy,
    });

    // Build tree
    // Root -> Viewport -> [Node, Toolbar]
    root.children = [viewport];
    viewport.parent = root;

    viewport.children = [node, toolbar];
    node.parent = viewport;
    toolbar.parent = viewport;

    // Set Node Position (Unscaled relative to Viewport)
    node.renderObject.offset = { dx: 100, dy: 100 };
  });

  // Test hitTest with Layout Coordinates (Assuming framework transforms coords before calling hitTest)
  it('hitTest should work with Layout Coordinates regardless of scale', () => {
    viewport.scale = 2;
    viewport.tx = 50;
    viewport.ty = 50;

    // Node Layout Pos: (100, 100)
    // Right Button Layout Pos: 206, 115
    // hitTest expects Layout Coordinates

    const hit = toolbar.hitTest(210, 120);
    expect(hit).toBe(true);

    const miss = toolbar.hitTest(200, 120);
    expect(miss).toBe(false);
  });

  // Test onPointerDown with Screen Coordinates (Real user interaction)
  it('onPointerDown should handle Screen Coordinates when scaled', () => {
    viewport.scale = 2;
    viewport.tx = 0;
    viewport.ty = 0;

    // Right Button Layout Pos: 206, 115
    // Screen Pos (Scale=2): 412, 230
    // Center Screen: 412 + 10 = 422, 230 + 10 = 240 (approx)

    // Simulate event with Screen Coordinates
    const event = {
      x: 422,
      y: 240,
      stopPropagation: vi.fn(),
      target: toolbar,
    } as unknown as InkwellEvent;

    toolbar.onPointerDown(event);

    // Should trigger callback
    // Right button triggers addChildRight or addSibling depending on context?
    // In default setup (root node?), it might be different.
    // Let's check resolveSides logic in code:
    // If isRoot (!edge), allowed: ['left', 'right']
    // Right button -> addChildRight

    expect(onAddChildSideSpy).toHaveBeenCalled();
  });

  it('onPointerDown should handle Screen Coordinates with Translation', () => {
    viewport.scale = 1;
    viewport.tx = 50;
    viewport.ty = 50;

    // Right Button Layout Pos: 206, 115
    // Screen Pos = Layout + Tx = 256, 165
    // Click at 266, 175

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
