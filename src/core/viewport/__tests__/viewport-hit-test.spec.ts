import { describe, expect, it, vi } from 'vitest';

import { Container } from '../../container';
import { WidgetRegistry } from '../../registry';
import { ScrollView } from '../scroll-view';

import type { BuildContext } from '../../type';

// Register components
WidgetRegistry.registerType('ScrollView', ScrollView);
WidgetRegistry.registerType('Container', Container);

const mockContext: BuildContext = {
  renderer: {
    save: vi.fn(),
    restore: vi.fn(),
    transform: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    drawRect: vi.fn(), // Add drawRect
    fillRect: vi.fn(), // Might be needed
    strokeRect: vi.fn(), // Might be needed
    getRawInstance: vi.fn(() => ({
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    })),
  } as any,
  worldMatrix: [1, 0, 0, 1, 0, 0],
};

describe('ScrollView Coordinate & HitTest', () => {
  it('ScrollView children should have correct absolute position when scrolled', () => {
    const child = new Container({
      type: 'Container',
      width: 100,
      height: 300, // Increased height to allow scrolling
      pointerEvents: 'auto', // Important: Container defaults to 'none'
    });

    const scrollView = new ScrollView({
      type: 'ScrollView',
      width: 200,
      height: 200,
    });

    // Manually link parent-child for test environment
    // Use any cast to bypass potential readonly/protected issues in test
    (scrollView as any).children = [child];
    child.parent = scrollView;

    // Initial layout
    scrollView.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    // Initial paint to update matrices
    scrollView.paint(mockContext);

    // Verify child layout happened
    expect(child.renderObject.size).toEqual({ width: 100, height: 300 });

    // Check initial position
    // Viewport at (0,0) (relative to unknown parent, but offset defaults to 0,0)
    expect(scrollView.renderObject.offset).toEqual({ dx: 0, dy: 0 });
    expect(child.renderObject.offset).toEqual({ dx: -0, dy: -0 });

    const initialPos = child.getAbsolutePosition();
    expect(initialPos).toEqual({ dx: 0, dy: 0 });

    // Scroll
    scrollView.scrollBy(0, 50); // Scroll down 50px (content moves up)

    // Re-layout (usually triggered by framework, manual here)
    scrollView.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    // Re-paint to update matrices
    scrollView.paint(mockContext);

    const scrolledPos = child.getAbsolutePosition();
    // Child offset should be (0, -50)
    expect(child.renderObject.offset.dy).toBe(-50);
    // Absolute position should be (0, -50) + (0, 0) = (0, -50)
    expect(scrolledPos).toEqual({ dx: 0, dy: -50 });
  });

  it('HitTest should work correctly when scrolled', () => {
    const child = new Container({
      type: 'Container',
      width: 100,
      height: 100,
      // Add a known property or key to verify hit
      key: 'target-child',
      pointerEvents: 'auto', // Important: Container defaults to 'none'
      skipEvent: false, // Ensure container itself can be hit
    });

    const scrollView = new ScrollView({
      type: 'ScrollView',
      width: 200,
      height: 200,
      child,
    });

    // Manually link parent-child for test environment
    // Use any cast to bypass potential readonly/protected issues in test
    (scrollView as any).children = [child];
    child.parent = scrollView;

    scrollView.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    scrollView.paint(mockContext);

    // 1. Hit test at (10, 10) -> Should hit child
    let hit = scrollView.visitHitTest(10, 10);
    expect(hit).toBe(child);

    // 2. Scroll
    scrollView.scrollBy(0, 50); // Content moves up by 50. Child is at (0, -50).
    scrollView.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    scrollView.paint(mockContext);

    // 3. Hit test at (10, 10) -> Should still hit child (10 >= -50 && 10 <= 50)
    hit = scrollView.visitHitTest(10, 10);
    expect(hit).toBe(child);

    // 4. Hit test at (150, 60) -> Should NOT hit child (child width 100)
    // Child x range: [0, 100]. Point x=150 is outside child.
    // Inside Viewport (200x200).
    hit = scrollView.visitHitTest(150, 60);
    // Should hit ScrollView itself
    expect(hit).toBe(scrollView);
  });
});
