import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapNode } from '../widgets/mindmap-node';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import Runtime from '@/runtime';
// Mock Canvas2DRenderer
const mockDrawRect = vi.fn();
const mockSave = vi.fn();
const mockRestore = vi.fn();
const mockTransform = vi.fn();

const mockRenderer = {
  initialize: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn(),
  render: vi.fn(),
  drawRect: mockDrawRect,
  save: mockSave,
  restore: mockRestore,
  transform: mockTransform,
  translate: vi.fn(),
  scale: vi.fn(),
  getRawInstance: () => ({
    canvas: {
      width: 800,
      height: 600,
      dataset: {},
      getContext: () => ({
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        measureText: () => ({ width: 0 }),
      }),
    },
  }),
  update: vi.fn(),
};

// Mock Runtime
vi.mock('@/runtime', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    default: class MockRuntime {
      dirtyWidgets = new Set();
      renderer = mockRenderer;
      container = document.createElement('div');
      rootWidget = null;

      static create() {
        return new MockRuntime();
      }

      scheduleUpdate(w) {
        this.dirtyWidgets.add(w);
      }

      tick(dirty) {
        if (dirty) {
          dirty.forEach((w) => this.dirtyWidgets.add(w));
        }
        // Simulate rebuild
        const list = Array.from(this.dirtyWidgets);
        this.dirtyWidgets.clear();
        for (const w of list) {
          w.rebuild();
          w.clearDirty();
          // In real runtime, we check isLayoutDirty
          if (w.isLayoutDirty()) {
            w.layout({ minWidth: 0, maxWidth: 800, minHeight: 0, maxHeight: 600 });
          }
        }
        // Simulate paint
        if (this.rootWidget) {
          const context = { renderer: this.renderer };
          this.rootWidget.paint(context);
        }
      }
    },
  };
});

describe('Viewport Selection Rect', () => {
  let runtime: any;
  let viewport: any;

  beforeEach(async () => {
    runtime = await Runtime.create('test-container');
    viewport = new MindMapViewport({
      key: CustomComponentType.MindMapViewport,
      type: CustomComponentType.MindMapViewport,
      width: 800,
      height: 600,
    });
    viewport.runtime = runtime;
    runtime.rootWidget = viewport;

    // Initial layout
    viewport.layout({ minWidth: 0, maxWidth: 800, minHeight: 0, maxHeight: 600 });
  });

  it('should show selection rect during drag and hide after pointer up', () => {
    // 1. Pointer Down
    viewport.onPointerDown({
      nativeEvent: { buttons: 1, pointerId: 1 },
      x: 100,
      y: 100,
    });

    expect(viewport.selectionRect).toEqual({ x: 100, y: 100, width: 0, height: 0 });

    // 2. Pointer Move
    viewport.onPointerMove({
      nativeEvent: { pointerId: 1 },
      x: 200,
      y: 200,
    });

    expect(viewport.selectionRect).toEqual({ x: 100, y: 100, width: 100, height: 100 });

    // Verify layout scheduled
    expect(runtime.dirtyWidgets.has(viewport)).toBe(true);

    // Run tick to paint
    runtime.tick();

    // Verify drawRect called (selection rect)
    expect(mockDrawRect).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        stroke: '#1890ff',
      }),
    );

    mockDrawRect.mockClear();

    // 3. Pointer Up
    viewport.onPointerUp({
      nativeEvent: { pointerId: 1 },
      stopPropagation: vi.fn(),
    });

    expect(viewport.selectionRect).toBeNull();

    // Verify layout scheduled (crucial fix verification)
    expect(runtime.dirtyWidgets.has(viewport)).toBe(true);

    // Run tick to paint
    runtime.tick();

    // Verify drawRect NOT called for selection rect
    expect(mockDrawRect).not.toHaveBeenCalled();
  });

  it('should select items inside the rect', () => {
    // Setup a child node
    const child = new MindMapNode({
      key: 'node-1',
      title: 'Node 1',
      type: CustomComponentType.MindMapNode,
    });
    child.renderObject = {
      offset: { dx: 150, dy: 150 }, // Inside 100,100 -> 200,200 rect
      size: { width: 50, height: 50 },
    } as any;

    // We need to attach child to viewport
    viewport.children = [child];
    child.parent = viewport;

    // 1. Drag to select
    viewport.onPointerDown({ nativeEvent: { buttons: 1, pointerId: 1 }, x: 100, y: 100 });
    viewport.onPointerMove({ nativeEvent: { pointerId: 1 }, x: 250, y: 250 }); // Rect: 100,100 -> 250,250 (150x150)

    // Verify selection updated during drag
    expect(viewport.selectedKeys).toContain('node-1');

    // 2. Pointer Up
    viewport.onPointerUp({ nativeEvent: { pointerId: 1 }, stopPropagation: vi.fn() });

    // Verify final selection
    expect(viewport.selectedKeys).toContain('node-1');
    expect(viewport.selectionRect).toBeNull();
  });
});
