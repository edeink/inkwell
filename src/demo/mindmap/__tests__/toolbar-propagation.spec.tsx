/** @jsxImportSource @/utils/compiler */
import { dispatchToTree } from '@/core/events';
import { describe, expect, it, vi } from 'vitest';
import { CustomComponentType } from '../type';
import { MindMapNodeToolbar } from '../widgets/mindmap-node-toolbar';
import { MindMapViewport } from '../widgets/mindmap-viewport';

describe('MindMapNodeToolbar Event Propagation', () => {
  it('should stop propagation when clicking add button', () => {
    const onActiveKeyChange = vi.fn();

    // Create Viewport
    const vp = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      activeKey: 'n1',
      onActiveKeyChange,
      width: 800,
      height: 600,
    });
    // Mock Viewport methods needed by Toolbar
    vp.key = CustomComponentType.MindMapViewport;
    vp.renderObject = {
      offset: { dx: 0, dy: 0 },
      size: { width: 800, height: 600 }
    };

    // Create Toolbar
    const toolbar = new MindMapNodeToolbar({
      type: CustomComponentType.MindMapNodeToolbar,
      activeKey: 'n1',
      onAddSibling: vi.fn(),
    });
    // Mock Toolbar methods/properties
    toolbar.key = 'toolbar';
    // Mock getActiveNode to return something so hitTest doesn't fail immediately if called
    // But we will mock hitToolbar anyway.

    // Construct Tree
    // Viewport -> Toolbar
    // Note: in real app, Toolbar is child of Layout, but for event bubbling test, direct parent is fine
    // as long as dispatchToTree works.
    vp.children = [toolbar];
    toolbar.parent = vp;
    // Set root
    (toolbar as any).__root = vp;
    (vp as any).__root = vp;

    // Mock hitToolbar to simulate clicking on a button
    // We need to cast to any to access private method or just override it if it was protected
    // Since it's private, we can't easily mock it on the prototype without casting.
    // However, onPointerDown calls this.hitToolbar(e.x, e.y).
    (toolbar as any).hitToolbar = () => ({ type: 'addBelow', side: 'right' });

    // Also mock getActiveNode because optimizeViewportForNewNode calls it
    (toolbar as any).getActiveNode = () => ({
      key: 'n1',
      getAbsolutePosition: () => ({ dx: 100, dy: 100 }),
      renderObject: { size: { width: 100, height: 50 } }
    });

    // Dispatch pointerdown with mock native event having buttons=1 (Left Mouse Button)
    dispatchToTree(vp, toolbar, 'pointerdown', 100, 100, { buttons: 1 } as any);

    // Expect Viewport's onPointerDown logic (clearing activeKey) NOT to be triggered
    // Viewport.onPointerDown calls setActiveKey(null) if it handles the event
    // onActiveKeyChange is called by setActiveKey
    expect(onActiveKeyChange).not.toHaveBeenCalledWith(null);
  });

  it('should NOT stop propagation when NOT clicking add button', () => {
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
      size: { width: 800, height: 600 }
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

    // Mock hitToolbar to return null (clicked on empty space in toolbar layer?)
    // Actually toolbar usually doesn't take space, but let's assume we clicked "through" it
    (toolbar as any).hitToolbar = () => null;

    dispatchToTree(vp, toolbar, 'pointerdown', 100, 100, { buttons: 1 } as any);

    // Expect Viewport to handle it and clear activeKey
    expect(onActiveKeyChange).toHaveBeenCalledWith(null);
  });
});
