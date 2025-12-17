import { describe, expect, it } from 'vitest';

import { Widget, createBoxConstraints, type WidgetProps } from '../base';
import { WidgetRegistry } from '../registry';

class TestContainer extends Widget {
  protected performLayout(constraints: any, childrenSizes: any[]) {
    return { width: 100, height: 100 };
  }
}

class TestChild extends Widget {
  protected performLayout(constraints: any, childrenSizes: any[]) {
    return { width: 50, height: 50 };
  }
}

WidgetRegistry.registerType('TestContainer', TestContainer);
WidgetRegistry.registerType('TestChild', TestChild);

describe('Layout Separation Logic', () => {
  it('should throw if children are not built before layout', () => {
    const rootData: WidgetProps = {
      type: 'TestContainer',
      children: [{ type: 'TestChild' }],
    };

    // Create widget without building children (createElement not called)
    const root = WidgetRegistry.createWidget(rootData)!;

    expect(root.children.length).toBe(0);

    const constraints = createBoxConstraints();

    expect(() => {
      root.layout(constraints);
    }).toThrowError(/Children must be built before layout/);
  });

  it('should pass if children are built before layout', () => {
    const rootData: WidgetProps = {
      type: 'TestContainer',
      children: [{ type: 'TestChild' }],
    };

    const root = WidgetRegistry.createWidget(rootData)!;
    root.createElement(rootData); // Build children explicitly

    expect(root.children.length).toBe(1);

    const constraints = createBoxConstraints();
    root.layout(constraints);

    expect(root.renderObject.size).toEqual({ width: 100, height: 100 });
  });

  it('should handle empty subtrees correctly', () => {
    const rootData: WidgetProps = {
      type: 'TestContainer',
      children: [], // Explicitly empty children
    };

    const root = WidgetRegistry.createWidget(rootData)!;
    root.createElement(rootData);

    expect(root.children.length).toBe(0);

    const constraints = createBoxConstraints();
    // Should not throw, as there are no children expected to be built
    root.layout(constraints);

    expect(root.renderObject.size).toEqual({ width: 100, height: 100 });
  });

  it('should handle single node correctly', () => {
    const rootData: WidgetProps = {
      type: 'TestContainer',
      // No children property implies empty or leaf
    };

    const root = WidgetRegistry.createWidget(rootData)!;
    root.createElement(rootData);

    expect(root.children.length).toBe(0);

    const constraints = createBoxConstraints();
    root.layout(constraints);

    expect(root.renderObject.size).toEqual({ width: 100, height: 100 });
  });

  it('should maintain layout performance for deep trees', () => {
    const depth = 1000;
    let current: WidgetProps = { type: 'TestChild' };

    // Create deep tree
    for (let i = 0; i < depth; i++) {
      current = {
        type: 'TestContainer',
        children: [current],
      };
    }

    const root = WidgetRegistry.createWidget(current)!;
    root.createElement(current);

    const start = performance.now();
    root.layout(createBoxConstraints());
    const end = performance.now();

    // Layout for 1000 nodes should be very fast (sub-10ms usually)
    // We set a conservative limit to detect massive regressions (e.g. exponential complexity)
    expect(end - start).toBeLessThan(50);
  });
});
