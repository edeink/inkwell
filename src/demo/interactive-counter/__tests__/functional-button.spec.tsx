import { beforeAll, describe, expect, it, vi } from 'vitest';

import { InteractiveCounterDemo } from '../app';

import type { InkwellEvent } from '@/core';

import { Themes } from '@/styles/theme';

// 模拟 Canvas getContext 以避免“未实现”错误
beforeAll(() => {
  if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      measureText: () => ({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 }),
      font: '',
      fillText: () => {},
      strokeText: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      closePath: () => {},
    })) as any;
  }
});

describe('计数器标签页功能按钮', () => {
  it('点击函数式按钮应增加计数', () => {
    // 实例化模板
    const template = new InteractiveCounterDemo({
      type: 'InteractiveCounterDemo',
      theme: Themes.light,
    });

    // 初始状态
    expect(template.state.count).toBe(0);

    // 1. 验证渲染结构
    const tree = template.render() as any;
    // tree 是 JSXElement { type: Padding, props: { children: [Row] } }

    const paddingChildren = Array.isArray(tree.props.children)
      ? tree.props.children
      : [tree.props.children];
    const rowElement = paddingChildren[0];

    const rowChildren = rowElement.props.children;
    // Row children: [Column, Column]
    expect(rowChildren).toHaveLength(2);

    const leftColumn = rowChildren[0];
    const colChildren = leftColumn.props.children;

    // Column children: [ClassButton, FunctionalButton, RawButton]
    expect(colChildren).toHaveLength(3);

    const funcBtnElement = colChildren[1];
    // funcBtnElement 是 <FunctionalButton onClick={...} />

    // 验证传递给 FunctionalButton 的 props
    expect(funcBtnElement.props.onClick).toBeDefined();

    // 执行函数式组件以验证其输出
    const FuncComp = funcBtnElement.type as (props: any) => any;
    const funcBtnOutput = FuncComp(funcBtnElement.props);

    // 验证 FunctionalButton (Container) 的输出
    expect(funcBtnOutput.key).toBe('functional-btn');
    expect(funcBtnOutput.props.onClick).toBeDefined();

    // 2. 验证点击处理程序
    // 触发输出的处理程序点击（调用 prop，进而调用 onInc）
    const onClick = funcBtnOutput.props.onClick;
    const mockEvent = {} as InkwellEvent;
    onClick?.(mockEvent);

    // 验证状态更新
    expect(template.state.count).toBe(1);
  });
});
