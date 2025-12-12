/** @jsxImportSource @/utils/compiler */
import { describe, it, expect } from 'vitest';

import { TemplateElement } from '../counter';

import { Widget, type WidgetData } from '@/core/base';
import { dispatchToTree } from '@/core/events';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function findByKey(root: any, key: string): any | null {
  if (!root) {
    return null;
  }
  if (String(root.key) === key) {
    return root;
  }
  for (const c of root.children || []) {
    const f = findByKey(c, key);
    if (f) {
      return f;
    }
  }
  return null;
}

describe('Container onClick 可多次触发（计数累加）', () => {
  it('连续两次点击均触发 onClick，状态累计为 2', () => {
    const json = compileElement(<TemplateElement />);
    const root = Widget.createWidget(json)!;
    root.createElement(root.props as WidgetData);
    const btn = findByKey(root, 'counter-btn')!;
    const pos = btn.getAbsolutePosition();
    dispatchToTree(root, btn, 'click', pos.dx + 1, pos.dy + 1);
    dispatchToTree(root, btn, 'click', pos.dx + 1, pos.dy + 1);
    const count = (root as unknown as { state: { count: number } }).state.count;
    expect(count).toBe(2);
  });
});
