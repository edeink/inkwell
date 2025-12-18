import { describe, expect, it } from 'vitest';

import { Viewport, type ViewportProps } from '../viewport';

describe('Viewport State Preservation', () => {
  it('should preserve scale when updated with undefined scale prop', () => {
    // 1. Create initial Viewport
    const props1: ViewportProps = {
      type: 'Viewport',
      scale: 1,
      tx: 0,
      ty: 0,
    };
    const vp = new Viewport(props1);

    // Verify initial state
    expect(vp.scale).toBe(1);

    // 2. Simulate user interaction (modifying internal state)
    vp.setTransform(2, 100, 100);
    expect(vp.scale).toBe(2);
    expect(vp.tx).toBe(100);

    // 3. Simulate re-render (Scene calls createElement via framework)
    // Framework calls: existingWidget.createElement(newProps)
    const props2: ViewportProps = {
      type: 'Viewport',
      // scale, tx, ty are undefined
      width: 800,
      height: 600,
    };

    vp.createElement(props2);

    // 4. Verify state is preserved
    expect(vp.scale).toBe(2);
    expect(vp.tx).toBe(100);
  });
});
