/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { TemplateElement } from '../counter';

import { Widget } from '@/core/base';
import { EventRegistry } from '@/core/events';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function createStage(id: string): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  el.style.width = '800px';
  el.style.height = '600px';
  document.body.appendChild(el);
  return el;
}

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

describe('Stateful Template 事件绑定', () => {
  it('Container onClick 通过 JSON 绑定后已注册到指定运行时', () => {
    const rtTag = { id: 'rt-bind' } as any;
    const json = compileElement(<TemplateElement />);
    const root = Widget.createWidget(json)!;
    (root as any).__runtime = rtTag;
    root.createElement(root.props as any);
    const btn = findByKey(root, 'counter-btn')!;
    const handlers = EventRegistry.getHandlers(String(btn.key), 'click', rtTag);
    expect(handlers.length).toBeGreaterThan(0);
  });
});
