import { describe, expect, it } from 'vitest';

import { Container } from '../core/container';
import { Text } from '../core/text';
import { computeWidgetTreeHash } from '../devtools/helper/tree';

describe('Tree Hash Stability', () => {
  it('should be stable for same widget tree structure', () => {
    // Manually construct a widget tree
    const root = new Container({ width: 100, height: 100 });
    const child = new Text({ text: 'Hello' });

    // We need to simulate the tree structure as Runtime does
    // Normally Runtime creates widgets via createWidget
    // Here we manually link them for testing hash
    // Note: Widget constructor does not take children directly in props usually,
    // it depends on how createChildWidget is implemented.
    // But computeWidgetTreeHash traverses w.children.

    // We need to mock children property or use a method to add child
    // Since Widget.children is protected or handled by specific widgets
    // We might need to cast to any to set children for test

    (root as any).children = [child];
    (child as any).parent = root;

    // Assign keys if they are missing (Runtime might assign them?)
    // If keys are missing, hash uses empty string.

    const hash1 = computeWidgetTreeHash(root);
    const hash2 = computeWidgetTreeHash(root);

    expect(hash1).toBe(hash2);

    // Modify tree
    (child as any).text = 'World';
    // Hash doesn't check props, only structure (key, type, children length)
    // So hash should be same!
    const hash3 = computeWidgetTreeHash(root);
    expect(hash3).toBe(hash1);

    // Add a child
    const child2 = new Text({ text: 'World' });
    (root as any).children = [child, child2];
    const hash4 = computeWidgetTreeHash(root);
    expect(hash4).not.toBe(hash1);
  });

  it('should be stable across different instances with same structure', () => {
    const root1 = new Container({ width: 100 });
    const child1 = new Text({ text: 'Hello' });
    (root1 as any).children = [child1];

    const root2 = new Container({ width: 100 });
    const child2 = new Text({ text: 'Hello' });
    (root2 as any).children = [child2];

    const hash1 = computeWidgetTreeHash(root1);
    const hash2 = computeWidgetTreeHash(root2);

    expect(hash1).toBe(hash2);
  });
});
