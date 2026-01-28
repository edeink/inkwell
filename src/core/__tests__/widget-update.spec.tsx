/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { createBoxConstraints, type WidgetProps } from '../base';
import { type PipelineOwner } from '../pipeline/owner';
import { Positioned } from '../positioned';
import { WidgetRegistry } from '../registry';
import { Stack } from '../stack';
import { Text } from '../text';

import '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

interface TestingWidget {
  _needsLayout: boolean;
  _needsPaint: boolean;
  owner: PipelineOwner | null;
}

describe('Widget 属性更新机制', () => {
  it('Positioned 组件在属性更新时应自动触发重新布局', () => {
    const initData = compileElement(
      <Stack key="stack" {...({} as WidgetProps)}>
        <Positioned key="pos" left={10} top={10} width={50} height={50} />
      </Stack>,
    );
    const stack = WidgetRegistry.createWidget(initData) as Stack;
    stack.createElement(initData as any);
    const positioned = stack.children[0] as Positioned;

    // 2. 初始布局
    const constraints = createBoxConstraints({ maxWidth: 200, maxHeight: 200 });
    stack.layout(constraints);

    // 验证初始位置
    expect(positioned.renderObject.offset).toEqual({ dx: 10, dy: 10 });
    // 布局完成后，needsLayout 应为 false
    expect((stack as unknown as TestingWidget)._needsLayout).toBe(false);

    // 3. 更新 Positioned 属性 (模拟复用)
    const newPositionedProps = compileElement(
      <Positioned key="pos" left={50} top={50} width={50} height={50} />,
    );

    // 调用 createElement 更新属性
    positioned.createElement(newPositionedProps as any);

    // 此时，Positioned 的属性已经变了
    expect(positioned.left).toBe(50);

    // 检查 Stack 是否被标记为需要布局
    expect((stack as unknown as TestingWidget)._needsLayout).toBe(true);

    // 再次布局
    stack.layout(constraints);

    // 验证位置更新
    expect(positioned.renderObject.offset).toEqual({ dx: 50, dy: 50 });
  });

  it('Text 组件在属性更新时应自动触发重新布局', () => {
    const data = compileElement(<Text text="Hello" fontSize={12} />);
    const text = WidgetRegistry.createWidget(data) as Text;

    // 模拟挂载 (设置 mock owner，使 isMounted 返回 true)
    // @ts-ignore
    text.owner = { scheduleLayoutFor: () => {}, schedulePaintFor: () => {} } as any;

    // 模拟挂载
    text.createElement(data as any);

    // 模拟 Layout 完成，重置状态
    (text as unknown as TestingWidget)._needsLayout = false;

    // 更新属性：修改 fontSize (应触发 layout)
    const newProps = compileElement(<Text text="Hello" fontSize={20} />);

    // Text 组件移除了 createElement，所以调用基类的 createElement
    // 基类会调用 didUpdateWidget -> Text.didUpdateWidget -> updateProperties
    text.createElement(newProps as any);

    // 验证字段更新
    expect(text.fontSize).toBe(20);

    // 验证标记
    // @ts-ignore
    expect(text._needsLayout).toBe(true);
  });

  it('Text 组件在仅颜色更新时应只触发重绘', () => {
    const data = compileElement(<Text text="Hello" color="red" />);
    const text = WidgetRegistry.createWidget(data) as Text;

    // 模拟挂载 (设置 mock owner)
    (text as unknown as TestingWidget).owner = {
      scheduleLayoutFor: () => {},
      schedulePaintFor: () => {},
    } as unknown as PipelineOwner;

    text.createElement(data as any);
    // @ts-ignore
    text._needsLayout = false;
    // @ts-ignore
    text._needsPaint = false;

    // 更新属性：修改 color (应只触发 paint)
    const newProps = compileElement(<Text text="Hello" color="blue" />);

    text.createElement(newProps as any);

    expect(text.color).toBe('blue');
    // @ts-ignore
    expect(text._needsLayout).toBe(false);
    // @ts-ignore
    expect(text._needsPaint).toBe(true);
  });
});
