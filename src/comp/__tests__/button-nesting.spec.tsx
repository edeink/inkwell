/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Button } from '../button';

import { Text } from '@/core';
import { WidgetRegistry } from '@/core/registry';
import { Themes } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Button 渲染结构稳定性', () => {
  it('多次 setState/rebuild 不应产生重复嵌套的 Container/Row', () => {
    const el = (
      <Button key="btn" theme={Themes.light}>
        <Text key="txt" text="删除" />
      </Button>
    );

    const data = compileElement(el as any);
    const btn = WidgetRegistry.createWidget(data as any) as unknown as Button;
    expect(btn).toBeTruthy();

    btn.createElement(data as any);

    const assertStable = () => {
      const container = btn.children[0] as any;
      expect(container?.type).toBe('Container');

      const row = container.children?.[0] as any;
      expect(row?.type).toBe('Row');

      const hasNestedContainer = (row.children ?? []).some((c: any) => c?.type === 'Container');
      expect(hasNestedContainer).toBe(false);

      const textCount = (row.children ?? []).filter((c: any) => c?.type === 'Text').length;
      expect(textCount).toBe(1);
    };

    assertStable();

    btn.setState({ hovered: true });
    expect(btn.rebuild()).toBe(true);
    assertStable();

    btn.setState({ active: true });
    expect(btn.rebuild()).toBe(true);
    assertStable();

    btn.setState({ active: false });
    expect(btn.rebuild()).toBe(true);
    assertStable();
  });
});
