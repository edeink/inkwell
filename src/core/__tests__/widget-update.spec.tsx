import { describe, expect, it } from 'vitest';

import { createBoxConstraints } from '../base';
import { Positioned } from '../positioned';
import { Stack } from '../stack';
import { Text } from '../text';

describe('Widget 属性更新机制', () => {
  it('Positioned 组件在属性更新时应自动触发重新布局', () => {
    // ... (保持原有的 Positioned 测试代码)
    // 1. 创建组件实例
    const positioned = new Positioned({
      type: 'Positioned',
      key: 'pos',
      left: 10,
      top: 10,
      width: 50,
      height: 50,
    });

    const stack = new Stack({
      type: 'Stack',
      width: 200,
      height: 200,
      children: [positioned as any],
    });

    // 手动建立父子关系和初始化
    positioned.parent = stack;
    stack.children = [positioned];
    // 初始化构建
    stack.createElement(stack.data);
    positioned.createElement(positioned.data);

    // 2. 初始布局
    const constraints = createBoxConstraints({ maxWidth: 200, maxHeight: 200 });
    stack.layout(constraints);

    // 验证初始位置
    expect(positioned.renderObject.offset).toEqual({ dx: 10, dy: 10 });
    // 布局完成后，needsLayout 应为 false
    // @ts-ignore
    expect(stack._needsLayout).toBe(false);

    // 3. 更新 Positioned 属性 (模拟复用)
    const newPositionedProps = {
      ...positioned.data,
      left: 50, // 改变位置
      top: 50,
    };

    // 调用 createElement 更新属性
    positioned.createElement(newPositionedProps);

    // 此时，Positioned 的属性已经变了
    expect(positioned.left).toBe(50);

    // 检查 Stack 是否被标记为需要布局
    // @ts-ignore
    expect(stack._needsLayout).toBe(true);

    // 再次布局
    stack.layout(constraints);

    // 验证位置更新
    expect(positioned.renderObject.offset).toEqual({ dx: 50, dy: 50 });
  });

  it('Text 组件在属性更新时应自动触发重新布局', () => {
    const text = new Text({
      type: 'Text',
      text: 'Hello',
      fontSize: 12,
    });

    // 模拟挂载
    text.createElement(text.data);

    // 模拟 Layout 完成，重置状态
    // @ts-ignore
    text._needsLayout = false;

    // 更新属性：修改 fontSize (应触发 layout)
    const newProps = {
      ...text.data,
      fontSize: 20,
    };

    // Text 组件移除了 createElement，所以调用基类的 createElement
    // 基类会调用 didUpdateWidget -> Text.didUpdateWidget -> updateProperties
    text.createElement(newProps);

    // 验证字段更新
    expect(text.fontSize).toBe(20);

    // 验证标记
    // @ts-ignore
    expect(text._needsLayout).toBe(true);
  });

  it('Text 组件在仅颜色更新时应只触发重绘', () => {
    const text = new Text({
      type: 'Text',
      text: 'Hello',
      color: 'red',
    });

    text.createElement(text.data);
    // @ts-ignore
    text._needsLayout = false;
    // @ts-ignore
    text._needsPaint = false;

    // 更新属性：修改 color (应只触发 paint)
    const newProps = {
      ...text.data,
      color: 'blue',
    };

    text.createElement(newProps);

    expect(text.color).toBe('blue');
    // @ts-ignore
    expect(text._needsLayout).toBe(false);
    // @ts-ignore
    expect(text._needsPaint).toBe(true);
  });
});
