/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Template } from '../counter';

import type { WidgetProps } from '@/core/base';

import { EventRegistry } from '@/core/events';
import { findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Stateful Template 事件绑定', () => {
  it('Container onClick 通过 JSON 绑定后已注册到指定运行时', () => {
    const rtTag = { id: 'rt-bind' };
    const json = compileElement(<Template />);
    const root = WidgetRegistry.createWidget(json)!;
    root.__runtime = rtTag;
    root.createElement(root.props);
    const btn = findWidget(root as any, '#counter-btn') as any;
    const handlers = EventRegistry.getHandlers(String(btn.key), 'click');
    expect(handlers.length).toBeGreaterThan(0);
  });
});
