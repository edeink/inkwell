import { beforeAll, describe, expect, it, vi } from 'vitest';

import { Template } from '../counter';

import type { InkwellEvent } from '@/core';

// Mock Canvas getContext to avoid "Not implemented" error
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

describe('CounterTab Functional Button', () => {
  it('点击函数式按钮应增加计数', () => {
    // Instantiate Template
    const template = new Template({ type: 'Template' });

    // Initial state
    // @ts-expect-error 访问私有状态进行验证
    expect(template.state.count).toBe(0);

    // 1. Verify render structure
    const tree = template.render() as any;
    // tree is JSXElement { type: Row, props: { children: [...] } }

    const children = tree.props.children;
    // Row children: [Button, Container(inline), FunctionalButton, Text]
    expect(children).toHaveLength(4);

    const funcBtnElement = children[2];
    // funcBtnElement is <FunctionalButton onClick={...} />

    // Verify props passed to FunctionalButton
    expect(funcBtnElement.props.onClick).toBeDefined();

    // Execute the functional component to verify its output
    const FuncComp = funcBtnElement.type as (props: any) => any;
    const funcBtnOutput = FuncComp(funcBtnElement.props);

    // Verify the output of FunctionalButton (Container)
    expect(funcBtnOutput.key).toBe('functional-btn');
    expect(funcBtnOutput.props.onClick).toBeDefined();

    // 2. Verify click handler
    // Trigger click on the output's handler (which calls the prop, which calls onInc)
    const onClick = funcBtnOutput.props.onClick;
    const mockEvent = {} as InkwellEvent;
    onClick?.(mockEvent);

    // Verify state update
    // @ts-expect-error 访问私有状态进行验证
    expect(template.state.count).toBe(1);
  });
});
