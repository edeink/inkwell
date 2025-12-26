import { describe, expect, it } from 'vitest';

import { Widget } from '../base';
import { Wrap } from '../wrap';

import type { BoxConstraints, Size } from '../base';

// Mock Widget with fixed size
class FixedSizeBox extends Widget {
  constructor(
    public w: number,
    public h: number,
  ) {
    super({ type: 'FixedSizeBox' });
  }

  protected performLayout(constraints: BoxConstraints): Size {
    return {
      width: Math.min(this.w, constraints.maxWidth),
      height: Math.min(this.h, constraints.maxHeight),
    };
  }
}

describe('Wrap Layout', () => {
  it('should wrap children when exceeding maxWidth', () => {
    // 3 children, each 100px wide. Spacing 10.
    // Total needed for 1 line: 100 + 10 + 100 + 10 + 100 = 320.
    // MaxWidth: 300.
    // Should be:
    // Line 1: [Child 1, Child 2] -> Width 100 + 10 + 100 = 210.
    // Line 2: [Child 3] -> Width 100.
    // Total Height: 100 (Child 1) + 10 (runSpacing) + 100 (Child 3) = 210.

    const child1 = new FixedSizeBox(100, 100);
    const child2 = new FixedSizeBox(100, 100);
    const child3 = new FixedSizeBox(100, 100);

    const wrap = new Wrap({
      type: 'Wrap',
      spacing: 10,
      runSpacing: 10,
    });

    // Manually link children and set built flag to bypass build phase
    (wrap as any).children = [child1, child2, child3];
    (wrap as any)._isBuilt = true;
    child1.parent = wrap;
    child2.parent = wrap;
    child3.parent = wrap;

    wrap.layout({
      minWidth: 0,
      maxWidth: 300,
      minHeight: 0,
      maxHeight: 1000,
    });

    const size = wrap.renderObject.size;

    // Width should be max line width (210)
    expect(size.width).toBe(210);
    // Height should be 2 lines (210)
    expect(size.height).toBe(210);
  });

  it('should verify spacing and alignment logic - single line fit', () => {
    // Boundary test: Exact fit
    // 2 children 100px. Spacing 10.
    // Width 210.
    // Should be 1 line.

    const child1 = new FixedSizeBox(100, 100);
    const child2 = new FixedSizeBox(100, 100);
    const wrap = new Wrap({ type: 'Wrap', spacing: 10 });

    (wrap as any).children = [child1, child2];
    (wrap as any)._isBuilt = true;
    child1.parent = wrap;
    child2.parent = wrap;

    wrap.layout({
      minWidth: 0,
      maxWidth: 210,
      minHeight: 0,
      maxHeight: 1000,
    });

    expect(wrap.renderObject.size.height).toBe(100);
    expect(wrap.renderObject.size.width).toBe(210);
  });
});
