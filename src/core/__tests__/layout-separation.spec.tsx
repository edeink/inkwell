/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Widget, createBoxConstraints, type WidgetProps } from '../base';
import { WidgetRegistry } from '../registry';

import { compileElement } from '@/utils/compiler/jsx-compiler';

class TestContainer extends Widget {
  protected performLayout(constraints: any, childrenSizes: any[]) {
    return { width: 100, height: 100 };
  }
}

class TestChild extends Widget {
  protected performLayout(constraints: any, childrenSizes: any[]) {
    return { width: 50, height: 50 };
  }
}

WidgetRegistry.registerType('TestContainer', TestContainer);
WidgetRegistry.registerType('TestChild', TestChild);

describe('布局分离逻辑', () => {
  it('如果在布局前未构建子节点则应抛出错误', () => {
    const data = compileElement(
      <TestContainer>
        <TestChild />
      </TestContainer>,
    ) as unknown as WidgetProps;
    const root = WidgetRegistry.createWidget(data)!;

    expect(root.children.length).toBe(0);

    const constraints = createBoxConstraints();

    expect(() => {
      root.layout(constraints);
    }).toThrowError(/布局前必须先构建子节点/);
  });

  it('如果在布局前已构建子节点则应通过', () => {
    const data = compileElement(
      <TestContainer>
        <TestChild />
      </TestContainer>,
    ) as unknown as WidgetProps;
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data); // 显式构建子节点

    expect(root.children.length).toBe(1);

    const constraints = createBoxConstraints();
    root.layout(constraints);

    expect(root.renderObject.size).toEqual({ width: 100, height: 100 });
  });

  it('应正确处理空子树', () => {
    const data = compileElement(<TestContainer />) as unknown as WidgetProps;
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);

    expect(root.children.length).toBe(0);

    const constraints = createBoxConstraints();
    // 不应抛出错误，因为没有预期需要构建的子节点
    root.layout(constraints);

    expect(root.renderObject.size).toEqual({ width: 100, height: 100 });
  });

  it('应正确处理单节点', () => {
    const data = compileElement(<TestContainer />) as unknown as WidgetProps;
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);

    expect(root.children.length).toBe(0);

    const constraints = createBoxConstraints();
    root.layout(constraints);

    expect(root.renderObject.size).toEqual({ width: 100, height: 100 });
  });

  it('应在深层树中保持布局性能', () => {
    const depth = 1000;
    let current: WidgetProps = { type: 'TestChild' };

    // 创建深层树
    for (let i = 0; i < depth; i++) {
      current = {
        type: 'TestContainer',
        children: [current],
      };
    }

    const root = WidgetRegistry.createWidget(current)!;
    root.createElement(current);

    const start = performance.now();
    root.layout(createBoxConstraints());
    const end = performance.now();

    // 1000 个节点的布局应非常快（通常低于 10ms）
    // 设置保守限制以检测重大性能回退（如指数复杂度）
    expect(end - start).toBeLessThan(50);
  });
});
