import { describe, expect, it } from 'vitest';

import { Container, Widget } from '../index';

import type { BoxConstraints, Size } from '../base';

// 模拟 Widget 以捕获约束
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

describe('Container 约束 Bug', () => {
  it('当仅指定宽度时，应强制子组件使用该宽度约束', () => {
    const spy = new ConstraintSpy({});
    const container = new Container({
      type: 'Container',
      width: 300,
    });

    // 手动链接子组件并设置 built 标志以绕过构建阶段
    (container as any).children = [spy];
    (container as any)._isBuilt = true;
    (spy as any).parent = container;

    // 使用宽松约束布局容器
    container.layout({
      minWidth: 0,
      maxWidth: 800,
      minHeight: 0,
      maxHeight: 600,
    });

    // 容器宽度应为 300
    expect(container.renderObject.size.width).toBe(300);

    // 子组件应接收到严格的宽度约束 300
    expect(spy.receivedConstraints?.minWidth).toBe(300);
    expect(spy.receivedConstraints?.maxWidth).toBe(300);
  });
});
