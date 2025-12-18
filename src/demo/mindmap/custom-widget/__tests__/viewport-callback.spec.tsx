import { describe, expect, it, vi } from 'vitest';

import { Viewport, type ViewportProps } from '../viewport';

describe('Viewport Callbacks', () => {
  it('should call onViewChange when transform changes', () => {
    const onViewChange = vi.fn();
    const props: ViewportProps = {
      type: 'Viewport',
      scale: 1,
      tx: 0,
      ty: 0,
      onViewChange,
    };
    const vp = new Viewport(props);

    // 1. setTransform
    vp.setTransform(2, 100, 100);
    expect(onViewChange).toHaveBeenLastCalledWith({ scale: 2, tx: 100, ty: 100 });

    // 2. setPosition
    vp.setPosition(200, 200);
    expect(onViewChange).toHaveBeenLastCalledWith({ scale: 2, tx: 200, ty: 200 });

    // 3. setScale
    vp.setScale(3);
    expect(onViewChange).toHaveBeenLastCalledWith({ scale: 3, tx: 200, ty: 200 });
  });
});
