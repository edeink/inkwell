/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { InteractiveCounterDemo } from '../app';

import { dispatchToTree } from '@/core/events';
import { findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Container onClick 可多次触发（计数累加）', () => {
  it('连续两次点击均触发 onClick，状态累计为 2', () => {
    const json = compileElement(<InteractiveCounterDemo />);
    const root = WidgetRegistry.createWidget(json)!;
    root.createElement(root.data);
    const btn = findWidget(root as any, '#counter-btn') as any;
    const pos = btn.getAbsolutePosition();
    dispatchToTree(root, btn, 'click', pos.dx + 1, pos.dy + 1);
    dispatchToTree(root, btn, 'click', pos.dx + 1, pos.dy + 1);
    const count = (root as unknown as { state: { count: number } }).state.count;
    expect(count).toBe(2);
  });
});
