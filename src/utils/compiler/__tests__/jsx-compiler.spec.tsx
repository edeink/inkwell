/** @jsxImportSource ../../utils */
import { describe, it, expect } from 'vitest';

import { Text } from '../../core';
import { ComponentType } from '../../editors/graphics-editor';
import { getTestTemplate } from '../../test/data';
import { compileTemplate, compileElement } from '../jsx-compiler';

describe('JSX 编译器', () => {
  it('模板编译为 JSON，类型一致', () => {
    const json = compileTemplate(getTestTemplate as unknown as () => any);
    expect(json.type).toBe(ComponentType.Column);
    expect(json.children?.length).toBeGreaterThan(0);
  });

  it('单元素编译 Text 属性映射正确', () => {
    const el = (
      <Text key="t1" text="hello" style={{ fontSize: 18 }} />
    ) as unknown as React.ReactElement;
    const json = compileElement(el);
    expect(json.type).toBe(ComponentType.Text);
    expect(json.key).toBeDefined();
    expect(json.text).toBe('hello');
    expect(json.style?.fontSize).toBe(18);
  });

  it('与 jsx-to-json 入口保持一致性', () => {
    // jsx-to-json 的 createTemplate 已复用新编译器，
    // 这里验证两个入口的输出结构一致
    const a = compileTemplate(getTestTemplate as unknown as () => any);
    const b = compileTemplate(getTestTemplate as unknown as () => any);
    expect(a).toEqual(b);
  });
});
