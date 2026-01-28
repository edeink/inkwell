import { beforeAll, describe, expect, it, vi } from 'vitest';

import { InteractiveCounterDemo } from '../app';
import { FunctionalButton } from '../widgets/functional-button';

import type { InkwellEvent } from '@/core';

import { Themes } from '@/styles/theme';

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function findElement(root: any, predicate: (node: any) => boolean): any | null {
  if (!root || typeof root !== 'object') {
    return null;
  }
  if (predicate(root)) {
    return root;
  }

  const children = toArray(root.props?.children);
  for (const child of children) {
    const found = findElement(child, predicate);
    if (found) {
      return found;
    }
  }
  return null;
}

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
      theme: Themes.light,
    });

    // 初始状态
    expect(template.state.count).toBe(0);

    // 1. 验证渲染结构
    const tree = template.render() as any;
    const funcBtnElement = findElement(tree, (node) => node?.type === FunctionalButton);
    expect(funcBtnElement).toBeDefined();
    if (!funcBtnElement) {
      return;
    }

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
