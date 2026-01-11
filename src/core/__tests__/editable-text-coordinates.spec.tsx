import { beforeAll, describe, expect, it, vi } from 'vitest';

import { EditableText } from '../editable-text';

// Mock Canvas
beforeAll(() => {
  if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      measureText: (text: string) => ({ width: text.length * 10 }), // Mock width: 10px per char
      font: '',
    })) as any;
  }
});

describe('EditableText Coordinate & Visual Fixes', () => {
  it('should adjust selection color opacity correctly with spaces in rgba', () => {
    const editable = new EditableText({
      type: 'EditableText',
      value: 'test',
      selectionColor: 'rgba(22, 119, 255, 0.2)', // Contains spaces
    });

    // Access private method via any
    const result = (editable as any).adjustColorOpacity('rgba(22, 119, 255, 0.2)', 0.5);
    expect(result).toBe('rgba(22, 119, 255, 0.1)');
  });

  it('should calculate local point correctly without getViewState', () => {
    const editable = new EditableText({
      type: 'EditableText',
      value: 'test',
    });

    // Mock parent structure for getLocalPoint traversal
    (editable as any).renderObject = {
      offset: { dx: 10, dy: 10 }, // offset from parent
      size: { width: 100, height: 20 },
    };

    // Mock parent to stop traversal immediately or return null
    (editable as any).parent = null;

    const event = { x: 50, y: 50, stopPropagation: vi.fn() } as any;

    // Call getLocalPoint
    const pt = (editable as any).getLocalPoint(event);

    // Without viewState, it should default to scale 1, tx 0, ty 0
    // worldX = 50, worldY = 50
    // absX = 10, absY = 10 (from renderObject)
    // result = 40, 40
    expect(pt).not.toBeNull();
    expect(pt?.x).toBe(40);
    expect(pt?.y).toBe(40);
  });

  it('should calculate screen rect correctly without getViewState', () => {
    const editable = new EditableText({
      type: 'EditableText',
      value: 'test',
    });

    // Mock Runtime container
    const mockContainer = {
      getBoundingClientRect: () => ({ left: 100, top: 100 }),
    };
    (editable as any).runtime = { container: mockContainer };

    (editable as any).renderObject = {
      offset: { dx: 10, dy: 10 },
      size: { width: 100, height: 20 },
    };
    // Mock parent to ensure check passes
    (editable as any).parent = { parent: null };

    const rect = (editable as any).getWidgetScreenRect();

    expect(rect).not.toBeNull();
    // left: container(100) + offset(10) = 110
    expect(rect?.left).toBe(110);
    // top: container(100) + offset(10) = 110
    expect(rect?.top).toBe(110);
    // width: 100 * scale(1) = 100
    expect(rect?.width).toBe(100);
  });

  it('should update input position correctly', () => {
    const editable = new EditableText({
      type: 'EditableText',
      value: 'test',
    });

    // Mock internal methods
    const mockRect = { left: 110, top: 110, width: 100, height: 20, inputTop: 130 };
    (editable as any).getWidgetScreenRect = () => mockRect;

    // Ensure input exists
    if (!(editable as any).input) {
      (editable as any).createHiddenInput();
    }
    const input = (editable as any).input;

    (editable as any).updateInputPosition();

    expect(input.style.left).toBe('110px');
    expect(input.style.top).toBe('130px');
    expect(input.style.width).toBe('100px');
  });
});
