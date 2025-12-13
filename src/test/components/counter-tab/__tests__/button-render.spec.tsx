/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Button } from '../button';

import { Center, Widget } from '@/core';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function findByKey(root: Widget, key: string): Widget | null {
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
    const json = compileElement(<Button />);
    const btn = WidgetRegistry.createWidget(json)!;
    btn.createElement(btn.props);
    expect(btn.type).toBe('Button');
    expect(btn.children.length).toBeGreaterThan(0);
    const child = btn.children[0];
    expect(child.type).toBe('Container');
    expect(String(child.key)).toBe('counter-btn');
  });

  it('嵌套组件递归处理，结构保持', () => {
    const json = compileElement(
      <Center>
        <Button />
      </Center>,
    );
    const root = WidgetRegistry.createWidget(json)!;
    root.createElement(root.props);
    const btn = root.children[0];
    expect(btn.type).toBe('Button');
    expect(btn.children.length).toBeGreaterThan(0);
    const container = findByKey(root, 'counter-btn');
    expect(container).not.toBeNull();
    expect(container!.type).toBe('Container');
  });
});
