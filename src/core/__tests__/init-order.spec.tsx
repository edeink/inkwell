/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Checkbox, CheckboxGroup } from '@/comp';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Widget 初始化顺序', () => {
  it('StatefulWidget 首次创建不应因字段未初始化而报错', () => {
    const el = <Checkbox key="c1" defaultChecked={true} />;
    const data = compileElement(el);
    const w = WidgetRegistry.createWidget(data);
    expect(w).toBeTruthy();
    w!.createElement(data);
    expect((w as any).state.innerChecked).toBe(true);
  });

  it('CheckboxGroup 默认值应在首次渲染前生效', () => {
    const el = (
      <CheckboxGroup
        key="cg1"
        options={[{ key: 'a', label: 'A', value: 'a' }]}
        defaultValue={['a']}
      />
    );
    const data = compileElement(el);
    const w = WidgetRegistry.createWidget(data);
    expect(w).toBeTruthy();
    w!.createElement(data);
    expect((w as any).state.innerValue).toEqual(['a']);
  });
});
