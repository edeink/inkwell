/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { InteractiveCounterDemo } from '../app';

import { dispatchToTree } from '@/core/events';
import { findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';
import { Themes } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Container onClick 可多次触发（计数累加）', () => {
  it('连续两次点击均触发 onClick，状态累计为 2', () => {
    const json = compileElement(<InteractiveCounterDemo theme={Themes.light} />);
    const root = WidgetRegistry.createWidget(json)!;
    // Fix: 绑定 runtime 以启用事件注册
    (root as any)._runtime = {
      id: 'test-runtime',
      scheduleUpdate: () => {},
    };
    root.createElement(root.data);
    const btn = findWidget(root as any, '#counter-btn') as any;
    const pos = btn.getAbsolutePosition();
    dispatchToTree(root, btn, 'click', pos.dx + 1, pos.dy + 1);
    dispatchToTree(root, btn, 'click', pos.dx + 1, pos.dy + 1);
    const count = (root as unknown as { state: { count: number } }).state.count;
    expect(count).toBe(2);
  });
});
