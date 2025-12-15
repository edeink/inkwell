/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Button } from '../button';

import { Center, Widget } from '@/core';
import { findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('ButtonElement 渲染与递归编译', () => {
  it('ButtonElement 生成包含子节点的 Button', () => {
    const json = compileElement(<Button />);
    const btn = WidgetRegistry.createWidget(json)!;
    btn.createElement(btn.data);
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
    root.createElement(root.data);
    const btn = root.children[0];
    expect(btn.type).toBe('Button');
    expect(btn.children.length).toBeGreaterThan(0);
    const container = findWidget(root, '#counter-btn') as Widget | null;
    expect(container).not.toBeNull();
    expect(container!.type).toBe('Container');
  });
});
