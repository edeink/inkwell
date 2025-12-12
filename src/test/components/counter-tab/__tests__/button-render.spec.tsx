/** @jsxImportSource @/utils/compiler */
import { describe, it, expect } from 'vitest';

import { ButtonElement } from '../button';

import { Center } from '@/core';
import { Widget, type WidgetData } from '@/core/base';
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

describe('ButtonElement 渲染与递归编译', () => {
  it('ButtonElement 生成包含子节点的 Button', () => {
    const json = compileElement(<ButtonElement />);
    const btn = Widget.createWidget(json)!;
    btn.createElement(btn.props as WidgetData);
    expect(btn.type).toBe('Button');
    expect(btn.children.length).toBeGreaterThan(0);
    const child = btn.children[0];
    expect(child.type).toBe('Container');
    expect(String(child.key)).toBe('counter-btn');
  });

  it('嵌套组件递归处理，结构保持', () => {
    const json = compileElement(
      <Center>
        <ButtonElement />
      </Center>,
    );
    const root = Widget.createWidget(json)!;
    root.createElement(root.props as WidgetData);
    const btn = root.children[0];
    expect(btn.type).toBe('Button');
    expect(btn.children.length).toBeGreaterThan(0);
    const container = findByKey(root, 'counter-btn');
    expect(container).not.toBeNull();
    expect(container.type).toBe('Container');
  });
});
