import { describe, expect, it } from 'vitest';

import { Container, Widget } from '../index';

import type { BoxConstraints, Size } from '../base';

// Mock Widget to capture constraints
class ConstraintSpy extends Widget {
  public receivedConstraints: BoxConstraints | null = null;

  constructor(props: any) {
    super({ ...props, type: 'ConstraintSpy' });
  }

  protected performLayout(constraints: BoxConstraints, _childrenSizes: Size[]): Size {
    this.receivedConstraints = constraints;
    return { width: 10, height: 10 };
  }
}

describe('Container Constraints Bug', () => {
  it('should enforce width constraint on child when only width is specified', () => {
    const spy = new ConstraintSpy({});
    const container = new Container({
      type: 'Container',
      width: 300,
    });

    // Manually link children and set built flag to bypass build phase
    (container as any).children = [spy];
    (container as any)._isBuilt = true;
    (spy as any).parent = container;

    // Layout container with loose constraints
    container.layout({
      minWidth: 0,
      maxWidth: 800,
      minHeight: 0,
      maxHeight: 600,
    });

    // Container should be 300 wide
    expect(container.renderObject.size.width).toBe(300);

    // Child should receive tight width constraint of 300
    expect(spy.receivedConstraints?.minWidth).toBe(300);
    expect(spy.receivedConstraints?.maxWidth).toBe(300);
  });
});
