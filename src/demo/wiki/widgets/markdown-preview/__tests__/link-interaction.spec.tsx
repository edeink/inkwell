/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { BlockNodeRenderer } from '../block-renderers';
import { MarkdownParser, NodeType } from '../parser';

import { Container, Padding, Row, Text, Wrap, type Widget } from '@/core';
import { createTightConstraints } from '@/core/base';
import { dispatchToTree, hitTest } from '@/core/events/dispatcher';
import { EventRegistry } from '@/core/events/registry';
import { WidgetRegistry } from '@/core/registry';
import { Themes } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function ensureCoreTypesRegistered() {
  WidgetRegistry.registerType('Container', Container);
  WidgetRegistry.registerType('Padding', Padding);
  WidgetRegistry.registerType('Row', Row);
  WidgetRegistry.registerType('Text', Text);
  WidgetRegistry.registerType('Wrap', Wrap);
}

function updateMatrices(root: any) {
  const renderer = {
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    transform: () => {},
    setTransform: () => {},
    save: () => {},
    restore: () => {},
    drawRect: () => {},
    drawText: () => {},
    getResolution: () => 1,
  } as any;

  root.paint({ renderer } as any);
}

function findText(root: Widget, predicate: (t: Text) => boolean): Text | null {
  if (root instanceof Text && predicate(root)) {
    return root;
  }
  for (const child of root.children) {
    const hit = findText(child, predicate);
    if (hit) {
      return hit;
    }
  }
  return null;
}

describe('MarkdownPreview 链接交互回归', () => {
  it('鼠标按下/抬起应触发链接跳转', () => {
    ensureCoreTypesRegistered();

    const md = '[访问 Google](https://google.com)';
    const parser = new MarkdownParser();
    const ast = parser.parse(md);
    const first = ast.children?.[0];
    expect(first?.type).toBe(NodeType.Paragraph);

    const el = BlockNodeRenderer({ node: first!, theme: Themes.light, key: 'p0' }) as any;
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);
    root.layout(createTightConstraints(600, 200));
    updateMatrices(root);

    const linkText = findText(root, (t) => t.text === '访问 Google');
    expect(linkText).not.toBeNull();
    if (!linkText) {
      throw new Error('找不到链接 Text 组件');
    }

    const pos = linkText.getAbsolutePosition();
    const x = pos.dx + linkText.renderObject.size.width / 2;
    const y = pos.dy + linkText.renderObject.size.height / 2;

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null as any);

    const target = hitTest(root, x, y);
    expect(target).toBe(linkText);

    dispatchToTree(
      root,
      target!,
      'mousedown',
      x,
      y,
      new MouseEvent('mousedown', { clientX: x, clientY: y }) as any,
    );
    dispatchToTree(
      root,
      target!,
      'mouseup',
      x,
      y,
      new MouseEvent('mouseup', { clientX: x, clientY: y }) as any,
    );

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('https://google.com', '_blank');

    openSpy.mockRestore();
    root.dispose();
    EventRegistry.clearAll();
  });

  it('发生明显移动时不应触发链接跳转', () => {
    ensureCoreTypesRegistered();

    const md = '[访问 Google](https://google.com)';
    const parser = new MarkdownParser();
    const ast = parser.parse(md);
    const first = ast.children?.[0];
    expect(first?.type).toBe(NodeType.Paragraph);

    const el = BlockNodeRenderer({ node: first!, theme: Themes.light, key: 'p0' }) as any;
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);
    root.layout(createTightConstraints(600, 200));
    updateMatrices(root);

    const linkText = findText(root, (t) => t.text === '访问 Google');
    expect(linkText).not.toBeNull();
    if (!linkText) {
      throw new Error('找不到链接 Text 组件');
    }

    const pos = linkText.getAbsolutePosition();
    const x1 = pos.dx + linkText.renderObject.size.width / 2;
    const y1 = pos.dy + linkText.renderObject.size.height / 2;
    const x2 = x1 + 30;
    const y2 = y1;

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null as any);

    const target = hitTest(root, x1, y1);
    expect(target).toBe(linkText);

    dispatchToTree(
      root,
      target!,
      'mousedown',
      x1,
      y1,
      new MouseEvent('mousedown', { clientX: x1, clientY: y1 }) as any,
    );
    dispatchToTree(
      root,
      target!,
      'mouseup',
      x2,
      y2,
      new MouseEvent('mouseup', { clientX: x2, clientY: y2 }) as any,
    );

    expect(openSpy).not.toHaveBeenCalled();

    openSpy.mockRestore();
    root.dispose();
    EventRegistry.clearAll();
  });
});
