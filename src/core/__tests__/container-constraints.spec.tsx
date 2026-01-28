/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Widget, type BoxConstraints, type Size, type WidgetProps } from '../base';
import { Container } from '../container';
import { WidgetRegistry } from '../registry';

import { compileElement } from '@/utils/compiler/jsx-compiler';

class ConstraintSpy extends Widget<WidgetProps> {
  public receivedConstraints: BoxConstraints | null = null;

  protected performLayout(constraints: BoxConstraints, _childrenSizes: Size[]): Size {
    this.receivedConstraints = constraints;
    return { width: 10, height: 10 };
  }
}

WidgetRegistry.registerType('ConstraintSpy', ConstraintSpy);

describe('Container 约束 Bug', () => {
  it('当仅指定宽度时，应强制子组件使用该宽度约束', () => {
    const data = compileElement(
      <Container key="container" width={300}>
        <ConstraintSpy key="spy" />
      </Container>,
    );
    const container = WidgetRegistry.createWidget(data) as Container;
    container.createElement(data);

    container.layout({
      minWidth: 0,
      maxWidth: 800,
      minHeight: 0,
      maxHeight: 600,
    });

    const spy = container.children[0] as unknown as ConstraintSpy;

    expect(container.renderObject.size.width).toBe(300);
    expect(spy.receivedConstraints?.minWidth).toBe(300);
    expect(spy.receivedConstraints?.maxWidth).toBe(300);
  });
});
