/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Widget, type BoxConstraints, type Size, type WidgetProps } from '../base';
import { WidgetRegistry } from '../registry';
import { SizedBox } from '../sized-box';

import { compileElement } from '@/utils/compiler/jsx-compiler';

class SizedBoxConstraintSpy extends Widget<WidgetProps> {
  public receivedConstraints: BoxConstraints | null = null;

  protected performLayout(constraints: BoxConstraints, _childrenSizes: Size[]): Size {
    this.receivedConstraints = constraints;
    return { width: 10, height: 10 };
  }
}

WidgetRegistry.registerType('SizedBoxConstraintSpy', SizedBoxConstraintSpy);

describe('SizedBox 约束行为', () => {
  it('当指定宽高时，应向子组件传递紧约束', () => {
    const data = compileElement(
      <SizedBox width={340} height={460}>
        <SizedBoxConstraintSpy key="spy" />
      </SizedBox>,
    );
    const box = WidgetRegistry.createWidget(data) as SizedBox;
    box.createElement(data);

    box.layout({
      minWidth: 0,
      maxWidth: 360,
      minHeight: 0,
      maxHeight: 480,
    });

    const spy = box.children[0] as unknown as SizedBoxConstraintSpy;

    expect(box.renderObject.size.width).toBe(340);
    expect(box.renderObject.size.height).toBe(460);
    expect(spy.receivedConstraints?.minWidth).toBe(340);
    expect(spy.receivedConstraints?.maxWidth).toBe(340);
    expect(spy.receivedConstraints?.minHeight).toBe(460);
    expect(spy.receivedConstraints?.maxHeight).toBe(460);
  });

  it('当指定宽高超过父约束时，应按父约束收敛并传递紧约束', () => {
    const data = compileElement(
      <SizedBox width={500} height={700}>
        <SizedBoxConstraintSpy key="spy" />
      </SizedBox>,
    );
    const box = WidgetRegistry.createWidget(data) as SizedBox;
    box.createElement(data);

    box.layout({
      minWidth: 0,
      maxWidth: 300,
      minHeight: 0,
      maxHeight: 400,
    });

    const spy = box.children[0] as unknown as SizedBoxConstraintSpy;

    expect(box.renderObject.size.width).toBe(300);
    expect(box.renderObject.size.height).toBe(400);
    expect(spy.receivedConstraints?.minWidth).toBe(300);
    expect(spy.receivedConstraints?.maxWidth).toBe(300);
    expect(spy.receivedConstraints?.minHeight).toBe(400);
    expect(spy.receivedConstraints?.maxHeight).toBe(400);
  });
});
