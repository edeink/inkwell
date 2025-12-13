/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Template } from '../counter';

import type { WidgetProps } from '@/core/base';

import { EventRegistry } from '@/core/events';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function findByKey(root: WidgetProps, key: string): WidgetProps | null {
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

describe('Stateful Template 事件绑定', () => {
  it('Container onClick 通过 JSON 绑定后已注册到指定运行时', () => {
    const rtTag = { id: 'rt-bind' };
    const json = compileElement(<Template />);
    const root = WidgetRegistry.createWidget(json)!;
    root.__runtime = rtTag;
    root.createElement(root.props);
    const btn = findByKey(root, 'counter-btn')!;
    const handlers = EventRegistry.getHandlers(String(btn.key), 'click');
    expect(handlers.length).toBeGreaterThan(0);
  });
});
