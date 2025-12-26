/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { DemoButton as Button } from '../widgets/demo-button';

import { Text, Widget } from '@/core';
import { findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Button 组件生命周期与渲染次数', () => {
  it('首次渲染时 render 仅调用一次，且子节点无重复', () => {
    const spy = vi.spyOn(Button.prototype as any, 'render');
    const json = compileElement(
      <Button>
        <Text key="counter-btn-text-02" text="点击 +1" />
      </Button>,
    );
    const btn = WidgetRegistry.createWidget(json)!;
    btn.createElement(btn.data);
    expect(spy).toHaveBeenCalledTimes(1);
    const container = findWidget(btn as Widget, '#counter-btn') as Widget;
    const row = container.children[0] as Widget;
    expect(row.children.length).toBe(2);
    spy.mockRestore();
  });
});
