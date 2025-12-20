/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Text } from '@/core';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Text 自动注册测试 (JSX Compiler)', () => {
  it('无需手动注册即可注册并实例化 Text', () => {
    const el = <Text key="t-auto" text="hello" />;
    const json = compileElement(el);
    const w = WidgetRegistry.createWidget(json);
    expect(w).toBeTruthy();
    expect(WidgetRegistry.hasRegisteredType('Text')).toBe(true);
    expect(w?.type).toBe('Text');
  });
});
