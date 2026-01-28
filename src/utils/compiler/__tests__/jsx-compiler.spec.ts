import { describe, expect, it, vi } from 'vitest';

import { compileElement, type AnyElement } from '../jsx-compiler';
import { jsx } from '../jsx-runtime';

import { Column } from '@/core/flex/column';
import { Text } from '@/core/text';

// 模拟 WidgetRegistry
vi.mock('@/core/registry', async () => {
  return {
    WidgetRegistry: {
      hasRegisteredType: vi.fn((type: string) => ['Text', 'Column', 'Container'].includes(type)),
      isCompositeType: vi.fn(() => false),
      registerType: vi.fn(),
    },
    widgetRegistry: {
      getRegisteredTypes: vi.fn(() => ['Text', 'Column', 'Container']),
    },
  };
});

describe('JSX 编译器', () => {
  it('应该能够编译标准 Widget 组件', () => {
    const el = jsx(Text, { text: 'Hello' }) as AnyElement;
    const data = compileElement(el);
    expect(data.__inkwellType).toBe('Text');
    expect((data as any).text).toBe('Hello');
  });

  it('应该能够展开函数式组件', () => {
    // 定义一个简单的函数式组件
    const MyComponent = ({ title }: { title: string }) => {
      return jsx(Text, { text: title });
    };

    // 使用该组件
    const el = jsx(MyComponent, { title: 'World' }) as AnyElement;

    // 编译
    const data = compileElement(el);

    // 期望结果：函数组件被展开，最终得到 Text 组件的数据
    expect(data.__inkwellType).toBe('Text');
    expect((data as any).text).toBe('World');
  });

  it('应该能够处理嵌套的函数式组件', () => {
    const Child = ({ name }: { name: string }) => jsx(Text, { text: name });
    const Parent = ({ name }: { name: string }) => jsx(Child, { name });

    const el = jsx(Parent, { name: 'Nested' }) as AnyElement;
    const data = compileElement(el);

    expect(data.__inkwellType).toBe('Text');
    expect((data as any).text).toBe('Nested');
  });

  it('应该能够处理带有 children 的函数式组件', () => {
    const Wrapper = ({ children }: { children: any }) => {
      return jsx(Column, { children });
    };

    const el = jsx(Wrapper, {
      children: [jsx(Text, { text: 'Child 1' }), jsx(Text, { text: 'Child 2' })],
    }) as AnyElement;

    const data = compileElement(el);

    expect(data.__inkwellType).toBe('Column');
    expect(data.children).toHaveLength(2);
    expect(data.children?.[0].__inkwellType).toBe('Text');
    expect((data.children?.[0] as any).text).toBe('Child 1');
  });
});
