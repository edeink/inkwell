import { describe, expect, it } from 'vitest';

import { Container } from '../container';
import { WidgetRegistry } from '../registry';
import { Text } from '../text';

describe('Container Child Switch Layout', () => {
  it('should apply padding to new child when child is replaced', () => {
    WidgetRegistry.registerType('Text', Text);

    const padding = { left: 10, top: 10, right: 10, bottom: 10 };

    // 1. Setup Container with Child A
    const childA = new Text({ type: 'Text', text: 'A' });
    const container = new Container({
      type: 'Container',
      padding,
      width: 100,
      height: 100,
    });

    // Manually build/mount
    container.children = [childA];
    childA.parent = container;

    // 2. Layout
    const constraints = { minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 };
    container.layout(constraints);

    // Verify Child A position
    expect(childA.renderObject.offset.dx).toBe(10);
    expect(childA.renderObject.offset.dy).toBe(10);

    // 3. Switch to Child B
    // Simulate what rebuild does: call buildChildren
    const childBData = { type: 'Text', text: 'B', key: 'child-b' };

    // Manually call buildChildren to trigger the logic we fixed
    // Note: buildChildren is protected, so we cast to any
    (container as any).buildChildren([childBData]);

    // Get the new child instance
    const childB = container.children[0];

    // Verify container is marked for layout
    expect((container as any)._needsLayout).toBe(true);

    container.layout(constraints);

    // Verify Child B position
    expect(childB.renderObject.offset.dx).toBe(10);
    expect(childB.renderObject.offset.dy).toBe(10);
  });
});
