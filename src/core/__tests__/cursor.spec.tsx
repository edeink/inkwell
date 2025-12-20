/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Container } from '@/core';
import { Widget } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('光标配置', () => {
  it('应该在初始化时正确设置 cursor 属性', () => {
    const el = <Container cursor="pointer" />;
    const data = compileElement(el);
    const widget = WidgetRegistry.createWidget(data)!;
    expect(widget.cursor).toBe('pointer');
  });

  it('当 props 更新时应该更新 cursor 属性', () => {
    const el1 = <Container cursor="default" />;
    const data1 = compileElement(el1);
    const widget = WidgetRegistry.createWidget(data1)!;
    expect(widget.cursor).toBe('default');

    const el2 = <Container cursor="move" />;
    const data2 = compileElement(el2);
    // Simulate update
    widget.createElement(data2);
    expect(widget.cursor).toBe('move');
  });

  it('应该支持所有定义的 cursor 类型', () => {
    const types = ['text', 'wait', 'help', 'not-allowed', 'grab'] as const;
    types.forEach((type) => {
      const el = <Container cursor={type} />;
      const data = compileElement(el);
      const widget = WidgetRegistry.createWidget(data)!;
      expect(widget.cursor).toBe(type);
    });
  });

  it('模拟 dispatcher 中的 cursor 解析逻辑 (冒泡查找)', () => {
    // 父节点有光标，子节点无 -> 应使用父节点光标
    // 父节点有光标，子节点有光标 -> 应使用子节点光标

    const parentEl = <Container cursor="move" />;
    const parentData = compileElement(parentEl);
    const parent = WidgetRegistry.createWidget(parentData)!;

    const childEl = <Container cursor="text" />;
    const childData = compileElement(childEl);
    const child = WidgetRegistry.createWidget(childData)!;

    child.parent = parent;

    // 模拟 dispatcher.ts 中的逻辑
    function resolveCursor(target: Widget | null): string {
      let cursor = 'default';
      let cur = target;
      while (cur) {
        if (cur.cursor) {
          cursor = cur.cursor;
          break;
        }
        cur = cur.parent;
      }
      return cursor;
    }

    expect(resolveCursor(child)).toBe('text');

    child.cursor = undefined;
    expect(resolveCursor(child)).toBe('move');

    parent.cursor = undefined;
    expect(resolveCursor(child)).toBe('default');
  });
});
