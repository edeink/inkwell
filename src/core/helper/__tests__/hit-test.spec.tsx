import { describe, expect, it } from 'vitest';

import { createBoxConstraints } from '../../base';
import { Container } from '../../container';
import { Stack } from '../../stack';
import { hitTest } from '../hit-test';

describe('helper hitTest', () => {
  it('pointerEvent 为 none 时仍可命中节点', () => {
    const child = new Container({
      type: 'Container',
      key: 'child',
      width: 20,
      height: 20,
      pointerEvent: 'none',
    });

    const root = new Stack({
      type: 'Stack',
      children: [],
    });
    root.children = [child];
    child.parent = root;

    root.layout(createBoxConstraints({ maxWidth: 100, maxHeight: 100 }));

    const res = hitTest(root, 10, 10);
    expect(res?.key).toBe('child');
  });
});
