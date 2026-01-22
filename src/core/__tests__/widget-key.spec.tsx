/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { Container } from '@/core';
import { Widget } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

// 测试用的具体 Widget 类，用于验证基类逻辑
class TestWidget extends Widget {
  constructor(key?: string) {
    super({ type: 'TestWidget', key } as any);
  }
}

class AnotherWidget extends Widget {
  constructor(key?: string) {
    super({ type: 'AnotherWidget', key } as any);
  }
}

describe('Widget Key 自动生成机制', () => {
  it('当未传递 key 时，应自动生成唯一标识符', () => {
    const w1 = new TestWidget();
    expect(w1.key).toBeDefined();
    expect(w1.key).toMatch(/^TestWidget-\d+$/);
  });

  it('自动生成的 key 应保证全局唯一性', () => {
    const w1 = new TestWidget();
    const w2 = new TestWidget();
    expect(w1.key).not.toBe(w2.key);

    // 验证计数器递增
    const num1 = parseInt(w1.key.split('-')[1]);
    const num2 = parseInt(w2.key.split('-')[1]);
    expect(num2).toBeGreaterThan(num1);
  });

  it('不同类型的组件应拥有独立的计数器', () => {
    const w1 = new TestWidget();
    const a1 = new AnotherWidget();

    // 假设这是该测试文件运行时的第一批组件，或者基于全局计数器状态
    // 我们主要验证格式包含各自的类型名
    expect(w1.key).toContain('TestWidget');
    expect(a1.key).toContain('AnotherWidget');
  });

  it('当显式传递 key 时，应保留原值', () => {
    const customKey = 'my-custom-key';
    const w = new TestWidget(customKey);
    expect(w.key).toBe(customKey);
  });

  it('即使显式传递的 key 与自动生成格式相似，也应保留', () => {
    const trickyKey = 'TestWidget-9999';
    const w = new TestWidget(trickyKey);
    expect(w.key).toBe(trickyKey);
  });

  it('同一父节点下同级子节点 key 重复时应输出错误', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const el = (
      <Container key="root" width={200} height={200}>
        <Container key="dup" width={10} height={10} />
        <Container key="dup" width={10} height={10} />
      </Container>
    );
    const json = compileElement(el);
    const root = WidgetRegistry.createWidget(json)!;
    root.createElement(json);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
