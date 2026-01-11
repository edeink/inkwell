import { describe, it, expect } from 'vitest';

import { resolveHitWidget } from '../resolve';

import type { Widget } from '@/core/base';

// Minimal mock to satisfy findWidget traversal and resolveHitWidget logic
function createMockWidget(key: string, children: any[] = []): Widget {
  const w = {
    key,
    type: 'Mock',
    children,
    parent: null,
    data: {},
  } as unknown as Widget;
  children.forEach((c) => {
    c.parent = w;
  });
  return w;
}

describe('resolveHitWidget', () => {
  it('should return the hit node if it is found in the tree', () => {
    const child = createMockWidget('child');
    const root = createMockWidget('root', [child]);

    // "Found in tree" means findWidget(root, '#child') returns it.
    const result = resolveHitWidget(root, child);
    expect(result).toBe(child);
  });

  it('should return the parent if hit node is not found but parent is', () => {
    const parent = createMockWidget('parent');
    const root = createMockWidget('root', [parent]);

    // Hidden child (not in children list of parent, so findWidget won't find it)
    const hiddenChild = createMockWidget('hidden');
    hiddenChild.parent = parent;
    // hiddenChild is NOT in parent.children

    const result = resolveHitWidget(root, hiddenChild);
    expect(result).toBe(parent);
  });

  it('should bubble up multiple levels', () => {
    const valid = createMockWidget('valid');
    const root = createMockWidget('root', [valid]);

    const hidden1 = createMockWidget('h1');
    hidden1.parent = valid;
    const hidden2 = createMockWidget('h2');
    hidden2.parent = hidden1;

    const result = resolveHitWidget(root, hidden2);
    expect(result).toBe(valid);
  });

  it('should return original node if nothing found (fallback)', () => {
    const root = createMockWidget('root');
    const detached = createMockWidget('detached');
    // detached has no parent or parent chain doesn't connect to root

    const result = resolveHitWidget(root, detached);
    expect(result).toBe(detached);
  });

  it('should handle null inputs', () => {
    const root = createMockWidget('root');
    expect(resolveHitWidget(root, null)).toBe(null);
  });
});
